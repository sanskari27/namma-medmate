package com.nammamedmate.server.application.customercredit;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.loyalty.LoyaltyService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerCreditService {

  private final CustomerCreditAccountRepository accountRepository;
  private final CustomerCreditLedgerEntryRepository ledgerRepository;
  private final CustomerRepository customerRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final LoyaltyService loyaltyService;
  private final Clock clock;

  public CustomerCreditService(
      CustomerCreditAccountRepository accountRepository,
      CustomerCreditLedgerEntryRepository ledgerRepository,
      CustomerRepository customerRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      LoyaltyService loyaltyService,
      Clock clock) {
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
    this.customerRepository = customerRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.loyaltyService = loyaltyService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public CustomerCreditView get(AuthPrincipal principal, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    CustomerCreditAccount account =
        accountRepository.findByTenantIdAndCustomerId(tenantId, customerId).orElse(null);
    if (account == null) {
      return emptyView(customerId);
    }
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  @Transactional(readOnly = true)
  public CustomerCreditOutstandingView listOutstanding(AuthPrincipal principal) {
    UUID tenantId = requireCrmAccess(principal);
    List<CustomerCreditAccount> accounts =
        accountRepository.findAllByTenantIdAndBalancePaiseGreaterThanOrderByBalancePaiseDesc(
            tenantId, 0L);
    Map<UUID, Customer> customers = new HashMap<>();
    for (CustomerCreditAccount account : accounts) {
      customerRepository
          .findByIdAndTenantIdAndDeletedAtIsNull(account.getCustomerId(), tenantId)
          .ifPresent(customer -> customers.put(customer.getId(), customer));
    }
    List<CustomerCreditOutstandingView.OutstandingItem> items =
        accounts.stream()
            .map(
                account -> {
                  Customer customer = customers.get(account.getCustomerId());
                  if (customer == null) {
                    return null;
                  }
                  return new CustomerCreditOutstandingView.OutstandingItem(
                      account.getCustomerId(),
                      customer.getName(),
                      customer.getPhone(),
                      account.getLimitPaise(),
                      account.getBalancePaise(),
                      available(account),
                      account.getVersion());
                })
            .filter(Objects::nonNull)
            .toList();
    return new CustomerCreditOutstandingView(items);
  }

  @Transactional
  public CustomerCreditView setLimit(
      AuthPrincipal principal, UUID customerId, long limitPaise, Long expectedVersion) {
    UUID tenantId = requireOwnerCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    if (limitPaise < 0) {
      throw validationError();
    }
    Instant now = clock.instant();
    CustomerCreditAccount account = lockOrCreate(tenantId, customerId, now);
    requireExpectedVersion(account, expectedVersion);
    account.setLimitPaise(limitPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    appendLedger(
        account,
        CustomerCreditLedgerType.LIMIT_SET,
        limitPaise,
        account.getBalancePaise(),
        null,
        null,
        null,
        null,
        principal.userId(),
        now);
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  @Transactional
  public CustomerCreditView charge(
      AuthPrincipal principal,
      UUID customerId,
      long amountPaise,
      UUID invoiceId,
      String idempotencyKey,
      Long expectedVersion) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    if (amountPaise <= 0) {
      throw validationError();
    }
    String normalizedKey = requireIdempotencyKey(idempotencyKey);
    CustomerCreditView replay = replayIfPresent(tenantId, customerId, normalizedKey, amountPaise);
    if (replay != null) {
      return replay;
    }
    Instant now = clock.instant();
    CustomerCreditAccount account = lockOrCreate(tenantId, customerId, now);
    requireExpectedVersion(account, expectedVersion);
    long available = available(account);
    if (amountPaise > available) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "CREDIT_LIMIT_EXCEEDED",
          "Charge exceeds available credit");
    }
    account.setBalancePaise(account.getBalancePaise() + amountPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    appendLedger(
        account,
        CustomerCreditLedgerType.SALE_CHARGE,
        amountPaise,
        account.getBalancePaise(),
        invoiceId,
        null,
        null,
        normalizedKey,
        principal.userId(),
        now);
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  @Transactional
  public CustomerCreditView chargeForSale(
      AuthPrincipal principal,
      UUID tenantId,
      UUID customerId,
      long amountPaise,
      UUID invoiceId,
      String idempotencyKey) {
    requireCustomer(customerId, tenantId);
    if (amountPaise <= 0) {
      throw validationError();
    }
    String normalizedKey = requireIdempotencyKey(idempotencyKey);
    CustomerCreditView replay = replayIfPresent(tenantId, customerId, normalizedKey, amountPaise);
    if (replay != null) {
      return replay;
    }
    Instant now = clock.instant();
    CustomerCreditAccount account = lockOrCreate(tenantId, customerId, now);
    long available = available(account);
    if (amountPaise > available) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "CREDIT_LIMIT_EXCEEDED",
          "Charge exceeds available credit");
    }
    account.setBalancePaise(account.getBalancePaise() + amountPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    appendLedger(
        account,
        CustomerCreditLedgerType.SALE_CHARGE,
        amountPaise,
        account.getBalancePaise(),
        invoiceId,
        null,
        null,
        normalizedKey,
        principal.userId(),
        now);
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  @Transactional
  public CustomerCreditView postCreditNote(
      AuthPrincipal principal,
      UUID tenantId,
      UUID customerId,
      long amountPaise,
      UUID invoiceId,
      String idempotencyKey) {
    requireCustomer(customerId, tenantId);
    if (amountPaise <= 0) {
      throw validationError();
    }
    String normalizedKey = requireIdempotencyKey(idempotencyKey);
    CustomerCreditView replay = replayIfPresent(tenantId, customerId, normalizedKey, amountPaise);
    if (replay != null) {
      return replay;
    }
    Instant now = clock.instant();
    CustomerCreditAccount account = lockOrCreate(tenantId, customerId, now);
    account.setBalancePaise(account.getBalancePaise() - amountPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    appendLedger(
        account,
        CustomerCreditLedgerType.CREDIT_NOTE,
        amountPaise,
        account.getBalancePaise(),
        invoiceId,
        null,
        null,
        normalizedKey,
        principal.userId(),
        now);
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  @Transactional
  public CustomerCreditView settle(
      AuthPrincipal principal,
      UUID customerId,
      long amountPaise,
      String mode,
      String reference,
      String idempotencyKey,
      Long expectedVersion) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    if (amountPaise <= 0) {
      throw validationError();
    }
    String normalizedMode = requireMode(mode);
    String normalizedKey = requireIdempotencyKey(idempotencyKey);
    CustomerCreditView replay = replayIfPresent(tenantId, customerId, normalizedKey, amountPaise);
    if (replay != null) {
      return replay;
    }
    Instant now = clock.instant();
    CustomerCreditAccount account = lockOrCreate(tenantId, customerId, now);
    requireExpectedVersion(account, expectedVersion);
    if (amountPaise > account.getBalancePaise()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "OVERPAYMENT", "Settlement exceeds outstanding balance");
    }
    account.setBalancePaise(account.getBalancePaise() - amountPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    appendLedger(
        account,
        CustomerCreditLedgerType.SETTLEMENT,
        amountPaise,
        account.getBalancePaise(),
        null,
        normalizedMode,
        blankToNull(reference),
        normalizedKey,
        principal.userId(),
        now);
    loyaltyService.earnOnSettlement(principal, tenantId, customerId, amountPaise, normalizedKey);
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  private CustomerCreditView replayIfPresent(
      UUID tenantId, UUID customerId, String idempotencyKey, long amountPaise) {
    return ledgerRepository
        .findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey)
        .map(
            existing -> {
              if (!existing.getCustomerId().equals(customerId)
                  || existing.getAmountPaise() != amountPaise) {
                throw new ApiException(
                    HttpStatus.CONFLICT,
                    "IDEMPOTENCY_CONFLICT",
                    "Idempotency key was already used with different payload");
              }
              CustomerCreditAccount account =
                  accountRepository
                      .findByTenantIdAndCustomerId(tenantId, customerId)
                      .orElseThrow(
                          () ->
                              new ApiException(
                                  HttpStatus.NOT_FOUND, "NOT_FOUND", "Customer was not found"));
              return toView(account, ledgerEntries(tenantId, customerId));
            })
        .orElse(null);
  }

  private CustomerCreditAccount lockOrCreate(UUID tenantId, UUID customerId, Instant now) {
    return accountRepository
        .lockByTenantIdAndCustomerId(tenantId, customerId)
        .orElseGet(
            () -> {
              CustomerCreditAccount created = new CustomerCreditAccount();
              created.setId(UUID.randomUUID());
              created.setTenantId(tenantId);
              created.setCustomerId(customerId);
              created.setLimitPaise(0L);
              created.setBalancePaise(0L);
              created.setVersion(0L);
              created.setCreatedAt(now);
              created.setUpdatedAt(now);
              return accountRepository.save(created);
            });
  }

  private void appendLedger(
      CustomerCreditAccount account,
      CustomerCreditLedgerType type,
      long amountPaise,
      long balanceAfter,
      UUID invoiceId,
      String settlementMode,
      String settlementReference,
      String idempotencyKey,
      UUID createdBy,
      Instant now) {
    CustomerCreditLedgerEntry entry = new CustomerCreditLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(account.getTenantId());
    entry.setCustomerId(account.getCustomerId());
    entry.setAccountId(account.getId());
    entry.setType(type);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(balanceAfter);
    entry.setInvoiceId(invoiceId);
    entry.setSettlementMode(settlementMode);
    entry.setSettlementReference(settlementReference);
    entry.setIdempotencyKey(idempotencyKey);
    entry.setCreatedByUserId(createdBy);
    entry.setOccurredAt(now);
    entry.setCreatedAt(now);
    ledgerRepository.save(entry);
  }

  private List<CustomerCreditView.LedgerItem> ledgerEntries(UUID tenantId, UUID customerId) {
    return ledgerRepository
        .findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(tenantId, customerId)
        .stream()
        .map(
            entry ->
                new CustomerCreditView.LedgerItem(
                    entry.getId(),
                    entry.getType(),
                    entry.getAmountPaise(),
                    entry.getBalanceAfterPaise(),
                    entry.getInvoiceId(),
                    entry.getSettlementMode(),
                    entry.getSettlementReference(),
                    entry.getOccurredAt()))
        .toList();
  }

  private static CustomerCreditView emptyView(UUID customerId) {
    return new CustomerCreditView(customerId, 0L, 0L, 0L, 0L, List.of());
  }

  private static CustomerCreditView toView(
      CustomerCreditAccount account, List<CustomerCreditView.LedgerItem> entries) {
    return new CustomerCreditView(
        account.getCustomerId(),
        account.getLimitPaise(),
        account.getBalancePaise(),
        available(account),
        account.getVersion(),
        entries);
  }

  private static long available(CustomerCreditAccount account) {
    return Math.max(0L, account.getLimitPaise() - account.getBalancePaise());
  }

  private static void requireExpectedVersion(CustomerCreditAccount account, Long expectedVersion) {
    if (expectedVersion == null) {
      throw validationError();
    }
    if (account.getVersion() != expectedVersion) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "Credit balance was updated by someone else");
    }
  }

  private static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank()) {
      throw validationError();
    }
    String trimmed = key.trim();
    if (trimmed.length() > 128) {
      throw validationError();
    }
    return trimmed;
  }

  private static String requireMode(String mode) {
    if (mode == null || mode.isBlank()) {
      throw validationError();
    }
    String trimmed = mode.trim();
    if (trimmed.length() > 64) {
      throw validationError();
    }
    return trimmed.toUpperCase(Locale.ROOT);
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.length() > 200 ? trimmed.substring(0, 200) : trimmed;
  }

  private Customer requireCustomer(UUID customerId, UUID tenantId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Customer was not found"));
  }

  private UUID requireOwnerCrmAccess(AuthPrincipal principal) {
    UUID tenantId = requireCrmAccess(principal);
    if (principal.role() != AppUserRole.pharmacy_owner) {
      throw forbidden();
    }
    return tenantId;
  }

  private UUID requireCrmAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(CustomerCreditService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
