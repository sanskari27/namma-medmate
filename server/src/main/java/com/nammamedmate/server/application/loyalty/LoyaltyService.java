package com.nammamedmate.server.application.loyalty;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.subscription.SubscriptionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerLoyaltyAccount;
import com.nammamedmate.server.domain.CustomerLoyaltyLedgerEntry;
import com.nammamedmate.server.domain.LoyaltyLedgerType;
import com.nammamedmate.server.domain.LoyaltyPolicy;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceLine;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyAccountRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoyaltyService {

  private final CustomerLoyaltyAccountRepository accountRepository;
  private final CustomerLoyaltyLedgerEntryRepository ledgerRepository;
  private final CustomerRepository customerRepository;
  private final SalesInvoiceRepository salesInvoiceRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final SubscriptionService subscriptionService;
  private final Clock clock;

  public LoyaltyService(
      CustomerLoyaltyAccountRepository accountRepository,
      CustomerLoyaltyLedgerEntryRepository ledgerRepository,
      CustomerRepository customerRepository,
      SalesInvoiceRepository salesInvoiceRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      SubscriptionService subscriptionService,
      Clock clock) {
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
    this.customerRepository = customerRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.subscriptionService = subscriptionService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LoyaltyView get(AuthPrincipal principal, UUID customerId) {
    UUID tenantId = requireCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    CustomerLoyaltyAccount account =
        accountRepository.findByTenantIdAndCustomerId(tenantId, customerId).orElse(null);
    if (account == null) {
      return new LoyaltyView(customerId, 0L, 0L, List.of());
    }
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  @Transactional
  public LoyaltyView adjust(
      AuthPrincipal principal,
      UUID customerId,
      long points,
      String reason,
      String idempotencyKey,
      Long expectedVersion) {
    UUID tenantId = requireOwnerCrmAccess(principal);
    requireCustomer(customerId, tenantId);
    if (points == 0L) {
      throw validationError();
    }
    String trimmedReason = requireReason(reason);
    String key = requireIdempotencyKey(idempotencyKey);
    LoyaltyView replay = replayIfPresent(tenantId, customerId, key, points);
    if (replay != null) {
      return replay;
    }
    Instant now = clock.instant();
    CustomerLoyaltyAccount account = lockOrCreate(tenantId, customerId, now);
    requireExpectedVersion(account, expectedVersion);
    long next = account.getBalancePoints() + points;
    if (next < 0L) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          LoyaltyPolicy.INSUFFICIENT_POINTS,
          "This patient does not have enough points.");
    }
    account.setBalancePoints(next);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    append(
        account,
        LoyaltyLedgerType.ADJUSTMENT,
        Math.abs(points),
        points,
        0L,
        null,
        null,
        trimmedReason,
        key,
        principal.userId(),
        now);
    return toView(account, ledgerEntries(tenantId, customerId));
  }

  @Transactional
  public LoyaltyCompleteResult applyOnComplete(
      AuthPrincipal principal,
      SalesInvoice invoice,
      List<SalesInvoiceLine> lines,
      long redeemPoints,
      long paidExcludingKhataPaise,
      String completeKey) {
    if (invoice.getCustomerId() == null) {
      if (redeemPoints > 0L) {
        LoyaltyPolicy.requireCustomer(null);
      }
      return new LoyaltyCompleteResult(0L, 0L, 0L, 0L, 0L);
    }
    PlanCode plan = subscriptionService.resolvePlan(invoice.getTenantId());
    if (redeemPoints > 0L) {
      LoyaltyPolicy.assertEntitled(plan);
      LoyaltyPolicy.requireCustomer(invoice.getCustomerId());
    }
    long taxable = 0L;
    for (SalesInvoiceLine line : lines) {
      taxable += line.getLineTaxablePaise();
    }
    Instant now = clock.instant();
    CustomerLoyaltyAccount existing =
        accountRepository
            .lockByTenantIdAndCustomerId(invoice.getTenantId(), invoice.getCustomerId())
            .orElse(null);
    long balance = existing == null ? 0L : existing.getBalancePoints();
    if (redeemPoints > 0L) {
      LoyaltyPolicy.assertRedeem(redeemPoints, balance, invoice.getTotalPaise());
    }
    long taxablePaid = 0L;
    long pending = 0L;
    long earned = 0L;
    if (LoyaltyPolicy.entitled(plan)) {
      taxablePaid =
          LoyaltyPolicy.share(taxable, paidExcludingKhataPaise, invoice.getTotalPaise());
      if (taxablePaid > taxable) {
        taxablePaid = taxable;
      }
      pending = taxable - taxablePaid;
      earned = LoyaltyPolicy.earnPoints(taxablePaid);
    }
    if (redeemPoints == 0L && earned == 0L) {
      return new LoyaltyCompleteResult(0L, 0L, 0L, taxable, pending);
    }
    CustomerLoyaltyAccount account =
        existing != null ? existing : lockOrCreate(invoice.getTenantId(), invoice.getCustomerId(), now);
    if (redeemPoints > 0L) {
      applyDelta(
          account,
          LoyaltyLedgerType.REDEEM,
          redeemPoints,
          -redeemPoints,
          0L,
          invoice.getId(),
          null,
          null,
          "loyalty-redeem:" + completeKey,
          principal.userId(),
          now);
    }
    long redeemPaise = LoyaltyPolicy.redeemPaise(redeemPoints);
    if (earned > 0L) {
      applyDelta(
          account,
          LoyaltyLedgerType.EARN,
          earned,
          earned,
          taxablePaid,
          invoice.getId(),
          null,
          null,
          "loyalty-earn:" + completeKey,
          principal.userId(),
          now);
    }
    return new LoyaltyCompleteResult(redeemPoints, redeemPaise, earned, taxable, pending);
  }

  @Transactional
  public void earnOnSettlement(
      AuthPrincipal principal, UUID tenantId, UUID customerId, long settlementPaise, String key) {
    if (customerId == null || settlementPaise <= 0L) {
      return;
    }
    String settleKey = requireIdempotencyKey("loyalty-settle:" + key);
    if (ledgerRepository.findByTenantIdAndIdempotencyKey(tenantId, settleKey).isPresent()) {
      return;
    }
    Instant now = clock.instant();
    CustomerLoyaltyAccount account = lockOrCreate(tenantId, customerId, now);
    PlanCode plan = subscriptionService.resolvePlan(tenantId);
    boolean entitled = LoyaltyPolicy.entitled(plan);
    List<SalesInvoice> invoices =
        salesInvoiceRepository.lockCompletedWithPendingLoyalty(
            tenantId, customerId, SalesInvoiceStatus.COMPLETED);
    long remaining = settlementPaise;
    long earnedTotal = 0L;
    long taxableTotal = 0L;
    for (SalesInvoice invoice : invoices) {
      if (remaining <= 0L) {
        break;
      }
      long pending = invoice.getLoyaltyPendingTaxablePaise();
      if (pending <= 0L || invoice.getLoyaltyTaxablePaise() <= 0L) {
        continue;
      }
      long remainingDue =
          LoyaltyPolicy.share(pending, invoice.getTotalPaise(), invoice.getLoyaltyTaxablePaise());
      if (remainingDue <= 0L) {
        remainingDue = pending;
      }
      long take = Math.min(remaining, remainingDue);
      long taxableTake =
          LoyaltyPolicy.share(take, invoice.getLoyaltyTaxablePaise(), invoice.getTotalPaise());
      if (taxableTake > pending) {
        taxableTake = pending;
      }
      invoice.setLoyaltyPendingTaxablePaise(pending - taxableTake);
      remaining -= take;
      if (entitled && taxableTake > 0L) {
        long earned = LoyaltyPolicy.earnPoints(taxableTake);
        if (earned > 0L) {
          invoice.setLoyaltyEarnedPoints(invoice.getLoyaltyEarnedPoints() + earned);
          earnedTotal += earned;
          taxableTotal += taxableTake;
        }
      }
      invoice.setUpdatedAt(now);
      salesInvoiceRepository.save(invoice);
    }
    if (entitled && earnedTotal > 0L) {
      applyDelta(
          account,
          LoyaltyLedgerType.SETTLEMENT_EARN,
          earnedTotal,
          earnedTotal,
          taxableTotal,
          null,
          null,
          null,
          settleKey,
          principal.userId(),
          now);
    }
  }

  @Transactional
  public void reverseForReturn(
      AuthPrincipal principal, SalesInvoice invoice, UUID salesReturnId, long refundTotalPaise) {
    if (invoice.getCustomerId() == null || refundTotalPaise <= 0L || invoice.getTotalPaise() <= 0L) {
      return;
    }
    String earnKey = "loyalty-return-earn:" + salesReturnId;
    String redeemKey = "loyalty-return-redeem:" + salesReturnId;
    if (ledgerRepository.findByTenantIdAndIdempotencyKey(invoice.getTenantId(), earnKey).isPresent()
        || ledgerRepository
            .findByTenantIdAndIdempotencyKey(invoice.getTenantId(), redeemKey)
            .isPresent()) {
      return;
    }
    long reverseEarn =
        cap(
            LoyaltyPolicy.share(
                invoice.getLoyaltyEarnedPoints(), refundTotalPaise, invoice.getTotalPaise()),
            invoice.getLoyaltyEarnedPoints());
    long reverseRedeem =
        cap(
            LoyaltyPolicy.share(
                invoice.getLoyaltyRedeemPoints(), refundTotalPaise, invoice.getTotalPaise()),
            invoice.getLoyaltyRedeemPoints());
    long pendingReduce =
        cap(
            LoyaltyPolicy.share(
                invoice.getLoyaltyPendingTaxablePaise(),
                refundTotalPaise,
                invoice.getTotalPaise()),
            invoice.getLoyaltyPendingTaxablePaise());
    if (reverseEarn == 0L && reverseRedeem == 0L && pendingReduce == 0L) {
      return;
    }
    Instant now = clock.instant();
    CustomerLoyaltyAccount account =
        lockOrCreate(invoice.getTenantId(), invoice.getCustomerId(), now);
    if (reverseRedeem > 0L) {
      applyDelta(
          account,
          LoyaltyLedgerType.RETURN_REDEEM,
          reverseRedeem,
          reverseRedeem,
          0L,
          invoice.getId(),
          salesReturnId,
          null,
          redeemKey,
          principal.userId(),
          now);
    }
    if (reverseEarn > 0L) {
      long debit = Math.min(reverseEarn, account.getBalancePoints());
      if (debit > 0L) {
        applyDelta(
            account,
            LoyaltyLedgerType.RETURN_EARN,
            debit,
            -debit,
            0L,
            invoice.getId(),
            salesReturnId,
            null,
            earnKey,
            principal.userId(),
            now);
      }
    }
    invoice.setLoyaltyEarnedPoints(invoice.getLoyaltyEarnedPoints() - reverseEarn);
    invoice.setLoyaltyRedeemPoints(invoice.getLoyaltyRedeemPoints() - reverseRedeem);
    invoice.setLoyaltyRedeemPaise(LoyaltyPolicy.redeemPaise(invoice.getLoyaltyRedeemPoints()));
    invoice.setLoyaltyPendingTaxablePaise(invoice.getLoyaltyPendingTaxablePaise() - pendingReduce);
    invoice.setUpdatedAt(now);
    salesInvoiceRepository.save(invoice);
  }

  private void applyDelta(
      CustomerLoyaltyAccount account,
      LoyaltyLedgerType type,
      long points,
      long delta,
      long taxablePaise,
      UUID invoiceId,
      UUID salesReturnId,
      String reason,
      String idempotencyKey,
      UUID actorId,
      Instant now) {
    long next = account.getBalancePoints() + delta;
    if (next < 0L) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          LoyaltyPolicy.INSUFFICIENT_POINTS,
          "This patient does not have enough points.");
    }
    account.setBalancePoints(next);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    append(
        account,
        type,
        points,
        delta,
        taxablePaise,
        invoiceId,
        salesReturnId,
        reason,
        idempotencyKey,
        actorId,
        now);
  }

  private void append(
      CustomerLoyaltyAccount account,
      LoyaltyLedgerType type,
      long points,
      long delta,
      long taxablePaise,
      UUID invoiceId,
      UUID salesReturnId,
      String reason,
      String idempotencyKey,
      UUID actorId,
      Instant now) {
    CustomerLoyaltyLedgerEntry entry = new CustomerLoyaltyLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(account.getTenantId());
    entry.setCustomerId(account.getCustomerId());
    entry.setAccountId(account.getId());
    entry.setType(type);
    entry.setPoints(points);
    entry.setDeltaPoints(delta);
    entry.setBalanceAfterPoints(account.getBalancePoints());
    entry.setInvoiceId(invoiceId);
    entry.setSalesReturnId(salesReturnId);
    entry.setTaxablePaise(taxablePaise);
    entry.setReason(reason);
    entry.setIdempotencyKey(idempotencyKey);
    entry.setCreatedByUserId(actorId);
    entry.setOccurredAt(now);
    entry.setCreatedAt(now);
    ledgerRepository.save(entry);
  }

  private CustomerLoyaltyAccount lockOrCreate(UUID tenantId, UUID customerId, Instant now) {
    return accountRepository
        .lockByTenantIdAndCustomerId(tenantId, customerId)
        .orElseGet(
            () -> {
              CustomerLoyaltyAccount created = new CustomerLoyaltyAccount();
              created.setId(UUID.randomUUID());
              created.setTenantId(tenantId);
              created.setCustomerId(customerId);
              created.setBalancePoints(0L);
              created.setVersion(0L);
              created.setCreatedAt(now);
              created.setUpdatedAt(now);
              return accountRepository.save(created);
            });
  }

  private LoyaltyView replayIfPresent(
      UUID tenantId, UUID customerId, String idempotencyKey, long points) {
    return ledgerRepository
        .findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey)
        .map(
            existing -> {
              if (!existing.getCustomerId().equals(customerId)
                  || existing.getDeltaPoints() != points) {
                throw new ApiException(
                    HttpStatus.CONFLICT,
                    "IDEMPOTENCY_CONFLICT",
                    "Idempotency key was already used with different payload");
              }
              CustomerLoyaltyAccount account =
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

  private List<CustomerLoyaltyLedgerEntry> ledgerEntries(UUID tenantId, UUID customerId) {
    return ledgerRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
        tenantId, customerId);
  }

  private LoyaltyView toView(
      CustomerLoyaltyAccount account, List<CustomerLoyaltyLedgerEntry> entries) {
    return new LoyaltyView(
        account.getCustomerId(),
        account.getBalancePoints(),
        account.getVersion(),
        entries.stream()
            .map(
                entry ->
                    new LoyaltyView.LedgerItem(
                        entry.getId(),
                        entry.getType(),
                        entry.getPoints(),
                        entry.getDeltaPoints(),
                        entry.getBalanceAfterPoints(),
                        entry.getInvoiceId(),
                        entry.getSalesReturnId(),
                        entry.getTaxablePaise(),
                        entry.getReason(),
                        entry.getOccurredAt()))
            .toList());
  }

  private Customer requireCustomer(UUID customerId, UUID tenantId) {
    return customerRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(customerId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Customer was not found"));
  }

  private void requireExpectedVersion(CustomerLoyaltyAccount account, Long expectedVersion) {
    if (expectedVersion == null || expectedVersion != account.getVersion()) {
      throw new ApiException(
          HttpStatus.CONFLICT, "STALE_STATE", "Points changed. Refresh and try again.");
    }
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
            .orElseThrow(LoyaltyService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static String requireReason(String reason) {
    if (reason == null || reason.isBlank()) {
      throw validationError();
    }
    String trimmed = reason.trim();
    if (trimmed.length() > 200) {
      throw validationError();
    }
    return trimmed;
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

  private static long cap(long value, long max) {
    if (value < 0L) {
      return 0L;
    }
    return Math.min(value, max);
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
