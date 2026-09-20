package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.AgingPolicy;
import com.nammamedmate.server.domain.HospitalCreditAccount;
import com.nammamedmate.server.domain.HospitalLedgerEntry;
import com.nammamedmate.server.domain.HospitalLedgerKind;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalLedgerEntryRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalPaymentService {

  private final HospitalArAccess access;
  private final HospitalCreditAccountRepository accountRepository;
  private final HospitalLedgerEntryRepository ledgerRepository;
  private final HospitalStatementService statementService;
  private final NotificationRoutingService notificationRoutingService;
  private final AuditService auditService;
  private final Clock clock;

  public HospitalPaymentService(
      HospitalArAccess access,
      HospitalCreditAccountRepository accountRepository,
      HospitalLedgerEntryRepository ledgerRepository,
      HospitalStatementService statementService,
      NotificationRoutingService notificationRoutingService,
      AuditService auditService,
      Clock clock) {
    this.access = access;
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
    this.statementService = statementService;
    this.notificationRoutingService = notificationRoutingService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional
  public HospitalPaymentView pay(AuthPrincipal principal, HospitalPaymentCommand command) {
    HospitalArAccess.BranchContext ctx = access.requireAccountWriter(principal);
    if (command == null) {
      throw shape();
    }
    String key = requireKey(command.idempotencyKey());
    String mode = HospitalPolicy.requirePaymentMode(command.mode());
    String reference = trimTo(command.reference(), 80);
    return ledgerRepository
        .findByTenantIdAndIdempotencyKey(ctx.tenantId(), key)
        .map(existing -> replay(existing, command.amountPaise(), mode, reference))
        .orElseGet(() -> persist(ctx, command, key, mode, reference));
  }

  @Transactional
  public HospitalReminderView remind(AuthPrincipal principal) {
    HospitalArAccess.BranchContext ctx = access.requireAccountWriter(principal);
    HospitalStatementView statement = statementService.get(principal, null, null, false);
    HospitalPolicy.assertReminderDue(statement.ageing().overduePaise());
    HospitalCreditAccount account =
        accountRepository
            .findByTenantId(ctx.tenantId())
            .orElseThrow(HospitalPolicy::accountRequired);
    LocalDate asOf = AgingPolicy.today(clock.instant());
    String eventKey = "hospital-overdue:" + account.getId() + ":" + asOf;
    var result =
        notificationRoutingService.route(
            new RouteCommand(
                eventKey,
                NotificationTrigger.HOSPITAL_CREDIT_DUE,
                ctx.tenantId(),
                null,
                account.getId(),
                null,
                null,
                null));
    auditService.record(
        new AuditRecordCommand(
            ctx.user().getId(),
            ctx.tenantId(),
            ctx.branchId(),
            "HOSPITAL_OVERDUE_REMIND",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"accountId\":\"" + account.getId() + "\"}"));
    return new HospitalReminderView(true, result.alreadyRouted());
  }

  private HospitalPaymentView persist(
      HospitalArAccess.BranchContext ctx,
      HospitalPaymentCommand command,
      String key,
      String mode,
      String reference) {
    HospitalCreditAccount account =
        accountRepository
            .lockByTenantId(ctx.tenantId())
            .orElseThrow(HospitalPolicy::accountRequired);
    if (command.expectedAccountVersion() != null
        && command.expectedAccountVersion() != account.getVersion()) {
      throw new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Account version is stale.");
    }
    HospitalPolicy.assertPayment(command.amountPaise(), account.getBalancePaise());
    Instant now = clock.instant();
    UUID paymentId = UUID.randomUUID();
    account.setBalancePaise(account.getBalancePaise() - command.amountPaise());
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    HospitalLedgerEntry ledger = new HospitalLedgerEntry();
    ledger.setId(paymentId);
    ledger.setTenantId(ctx.tenantId());
    ledger.setBranchId(ctx.branchId());
    ledger.setAccountId(account.getId());
    ledger.setKind(HospitalLedgerKind.PAYMENT);
    ledger.setDebitPaise(0L);
    ledger.setCreditPaise(command.amountPaise());
    ledger.setPaymentMode(mode);
    ledger.setPaymentReference(reference);
    ledger.setParticulars(
        "Payment " + mode + (reference == null || reference.isBlank() ? "" : " " + reference));
    ledger.setOccurredAt(now);
    ledger.setIdempotencyKey(key);
    ledger.setCreatedAt(now);
    try {
      ledgerRepository.saveAndFlush(ledger);
    } catch (DataIntegrityViolationException ex) {
      return ledgerRepository
          .findByTenantIdAndIdempotencyKey(ctx.tenantId(), key)
          .map(existing -> replay(existing, command.amountPaise(), mode, reference))
          .orElseThrow(() -> ex);
    }
    auditService.record(
        new AuditRecordCommand(
            ctx.user().getId(),
            ctx.tenantId(),
            ctx.branchId(),
            "HOSPITAL_PAYMENT_CREATE",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"id\":\"" + paymentId + "\"}"));
    return new HospitalPaymentView(
        ledger.getId(),
        ledger.getCreditPaise(),
        mode,
        reference,
        account.getBalancePaise(),
        account.getVersion(),
        ledger.getOccurredAt());
  }

  private HospitalPaymentView replay(
      HospitalLedgerEntry existing, long amountPaise, String mode, String reference) {
    if (existing.getKind() != HospitalLedgerKind.PAYMENT
        || existing.getCreditPaise() != amountPaise
        || (mode != null && !mode.equals(existing.getPaymentMode()))
        || (reference != null
            && existing.getPaymentReference() != null
            && !reference.equals(existing.getPaymentReference()))) {
      throw new ApiException(
          HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", "This request was already used.");
    }
    HospitalCreditAccount account =
        accountRepository
            .findByTenantId(existing.getTenantId())
            .orElseThrow(HospitalPolicy::accountRequired);
    return new HospitalPaymentView(
        existing.getId(),
        existing.getCreditPaise(),
        existing.getPaymentMode(),
        existing.getPaymentReference(),
        account.getBalancePaise(),
        account.getVersion(),
        existing.getOccurredAt());
  }

  private static String requireKey(String key) {
    if (key == null || key.isBlank() || key.length() > 80) {
      throw shape();
    }
    return key.trim();
  }

  private static String trimTo(String value, int max) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String trimmed = value.trim();
    if (trimmed.length() > max) {
      throw shape();
    }
    return trimmed;
  }

  private static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
