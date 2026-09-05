package com.nammamedmate.server.application.purchasereturn;

import com.nammamedmate.server.domain.PurchaseReturnPolicy;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import com.nammamedmate.server.domain.SupplierPayableAccount;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SupplierLedgerService {

  private final SupplierPayableAccountRepository accountRepository;
  private final SupplierLedgerEntryRepository ledgerRepository;
  private final SupplierRepository supplierRepository;

  public SupplierLedgerService(
      SupplierPayableAccountRepository accountRepository,
      SupplierLedgerEntryRepository ledgerRepository,
      SupplierRepository supplierRepository) {
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
    this.supplierRepository = supplierRepository;
  }

  public SupplierLedgerView get(
      UUID tenantId, UUID branchId, UUID supplierId, String supplierLegalName) {
    SupplierPayableAccount account =
        accountRepository
            .findByTenantIdAndBranchIdAndSupplierId(tenantId, branchId, supplierId)
            .orElse(null);
    if (account == null) {
      return new SupplierLedgerView(supplierId, supplierLegalName, 0L, 0L, List.of());
    }
    return toView(account, supplierLegalName, entries(tenantId, branchId, supplierId));
  }

  public SupplierDueListResult dues(UUID tenantId, UUID branchId, LocalDate todayIst) {
    List<SupplierPayableAccount> accounts =
        accountRepository
            .findAllByTenantIdAndBranchIdAndBalancePaiseGreaterThanOrderByBalancePaiseDesc(
                tenantId, branchId, 0L);
    if (accounts.isEmpty()) {
      return new SupplierDueListResult(List.of());
    }
    List<UUID> supplierIds = accounts.stream().map(SupplierPayableAccount::getSupplierId).toList();
    Map<UUID, LocalDate> earliestDue = new HashMap<>();
    for (SupplierLedgerEntry entry :
        ledgerRepository.findAllByTenantIdAndBranchIdAndSupplierIdInOrderByOccurredAtAsc(
            tenantId, branchId, supplierIds)) {
      if (entry.getType() != SupplierLedgerType.INVOICE || entry.getDueOn() == null) {
        continue;
      }
      earliestDue.putIfAbsent(entry.getSupplierId(), entry.getDueOn());
    }
    List<SupplierDueListResult.DueItem> items = new ArrayList<>();
    for (SupplierPayableAccount account : accounts) {
      LocalDate dueOn = earliestDue.get(account.getSupplierId());
      if (dueOn == null) {
        continue;
      }
      boolean overdue = !dueOn.isAfter(todayIst);
      boolean dueSoon = !dueOn.isAfter(todayIst.plusDays(7));
      if (!overdue && !dueSoon) {
        continue;
      }
      String name =
          supplierRepository
              .findByIdAndTenantId(account.getSupplierId(), tenantId)
              .map(Supplier::getLegalName)
              .orElse("");
      items.add(
          new SupplierDueListResult.DueItem(
              account.getSupplierId(), name, account.getBalancePaise(), dueOn, overdue));
    }
    return new SupplierDueListResult(items);
  }

  public SupplierPayableAccount postInvoice(
      UUID tenantId,
      UUID branchId,
      UUID supplierId,
      long amountPaise,
      UUID goodsReceiptId,
      LocalDate dueOn,
      String idempotencyKey,
      UUID userId,
      Instant now) {
    return post(
        tenantId,
        branchId,
        supplierId,
        SupplierLedgerType.INVOICE,
        amountPaise,
        amountPaise,
        goodsReceiptId,
        null,
        null,
        null,
        dueOn,
        idempotencyKey,
        userId,
        now,
        null);
  }

  public SupplierPayableAccount postDebitNote(
      UUID tenantId,
      UUID branchId,
      UUID supplierId,
      long amountPaise,
      UUID purchaseReturnId,
      String idempotencyKey,
      UUID userId,
      Instant now,
      Long expectedVersion) {
    return post(
        tenantId,
        branchId,
        supplierId,
        SupplierLedgerType.DEBIT_NOTE,
        amountPaise,
        -amountPaise,
        null,
        purchaseReturnId,
        null,
        null,
        null,
        idempotencyKey,
        userId,
        now,
        expectedVersion);
  }

  public SupplierPayableAccount postPayment(
      UUID tenantId,
      UUID branchId,
      UUID supplierId,
      long amountPaise,
      String mode,
      String reference,
      String idempotencyKey,
      UUID userId,
      Instant now,
      Long expectedVersion) {
    PurchaseReturnPolicy.assertPayment(amountPaise, currentBalance(tenantId, branchId, supplierId));
    try {
      return post(
          tenantId,
          branchId,
          supplierId,
          SupplierLedgerType.PAYMENT,
          amountPaise,
          -amountPaise,
          null,
          null,
          mode,
          reference,
          null,
          idempotencyKey,
          userId,
          now,
          expectedVersion);
    } catch (DataIntegrityViolationException ex) {
      if (causedBy(ex, "uq_supplier_ledger_payment_reference")) {
        throw PurchaseReturnPolicy.duplicateReference();
      }
      throw ex;
    }
  }

  private long currentBalance(UUID tenantId, UUID branchId, UUID supplierId) {
    return accountRepository
        .findByTenantIdAndBranchIdAndSupplierId(tenantId, branchId, supplierId)
        .map(SupplierPayableAccount::getBalancePaise)
        .orElse(0L);
  }

  private SupplierPayableAccount post(
      UUID tenantId,
      UUID branchId,
      UUID supplierId,
      SupplierLedgerType type,
      long amountPaise,
      long deltaPaise,
      UUID goodsReceiptId,
      UUID purchaseReturnId,
      String paymentMode,
      String paymentReference,
      LocalDate dueOn,
      String idempotencyKey,
      UUID userId,
      Instant now,
      Long expectedVersion) {
    SupplierLedgerEntry replay =
        ledgerRepository
            .findByTenantIdAndBranchIdAndIdempotencyKey(tenantId, branchId, idempotencyKey)
            .orElse(null);
    if (replay != null) {
      if (replay.getType() != type
          || replay.getAmountPaise() != amountPaise
          || !java.util.Objects.equals(replay.getSupplierId(), supplierId)) {
        throw PurchaseReturnPolicy.idempotencyConflict();
      }
      return accountRepository
          .findByTenantIdAndBranchIdAndSupplierId(tenantId, branchId, supplierId)
          .orElseThrow(SupplierLedgerService::notFound);
    }
    SupplierPayableAccount account = lockOrCreate(tenantId, branchId, supplierId, now);
    if (expectedVersion != null) {
      PurchaseReturnPolicy.assertExpectedVersion(account.getVersion(), expectedVersion);
    }
    if (type == SupplierLedgerType.PAYMENT) {
      PurchaseReturnPolicy.assertPayment(amountPaise, account.getBalancePaise());
    }
    account.setBalancePaise(account.getBalancePaise() + deltaPaise);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.saveAndFlush(account);
    SupplierLedgerEntry entry = new SupplierLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(tenantId);
    entry.setBranchId(branchId);
    entry.setSupplierId(supplierId);
    entry.setAccountId(account.getId());
    entry.setType(type);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(account.getBalancePaise());
    entry.setGoodsReceiptId(goodsReceiptId);
    entry.setPurchaseReturnId(purchaseReturnId);
    entry.setPaymentMode(paymentMode);
    entry.setPaymentReference(paymentReference);
    entry.setDueOn(dueOn);
    entry.setIdempotencyKey(idempotencyKey);
    entry.setCreatedByUserId(userId);
    entry.setOccurredAt(now);
    entry.setCreatedAt(now);
    try {
      ledgerRepository.saveAndFlush(entry);
    } catch (DataIntegrityViolationException ex) {
      if (causedBy(ex, "uq_supplier_ledger_idempotency")) {
        return post(
            tenantId,
            branchId,
            supplierId,
            type,
            amountPaise,
            deltaPaise,
            goodsReceiptId,
            purchaseReturnId,
            paymentMode,
            paymentReference,
            dueOn,
            idempotencyKey,
            userId,
            now,
            expectedVersion);
      }
      throw ex;
    }
    return account;
  }

  private SupplierPayableAccount lockOrCreate(
      UUID tenantId, UUID branchId, UUID supplierId, Instant now) {
    return accountRepository
        .lockByTenantIdAndBranchIdAndSupplierId(tenantId, branchId, supplierId)
        .orElseGet(
            () -> {
              SupplierPayableAccount created = new SupplierPayableAccount();
              created.setId(UUID.randomUUID());
              created.setTenantId(tenantId);
              created.setBranchId(branchId);
              created.setSupplierId(supplierId);
              created.setBalancePaise(0L);
              created.setVersion(0L);
              created.setCreatedAt(now);
              created.setUpdatedAt(now);
              return accountRepository.saveAndFlush(created);
            });
  }

  private List<SupplierLedgerView.EntryView> entries(
      UUID tenantId, UUID branchId, UUID supplierId) {
    return ledgerRepository
        .findAllByTenantIdAndBranchIdAndSupplierIdOrderByOccurredAtDesc(
            tenantId, branchId, supplierId)
        .stream()
        .map(
            entry ->
                new SupplierLedgerView.EntryView(
                    entry.getId(),
                    entry.getType(),
                    entry.getAmountPaise(),
                    entry.getBalanceAfterPaise(),
                    entry.getGoodsReceiptId(),
                    entry.getPurchaseReturnId(),
                    entry.getPaymentMode(),
                    entry.getPaymentReference(),
                    entry.getDueOn(),
                    entry.getOccurredAt()))
        .toList();
  }

  private static SupplierLedgerView toView(
      SupplierPayableAccount account,
      String supplierLegalName,
      List<SupplierLedgerView.EntryView> entries) {
    return new SupplierLedgerView(
        account.getSupplierId(),
        supplierLegalName,
        account.getBalancePaise(),
        account.getVersion(),
        entries);
  }

  private static boolean causedBy(Throwable ex, String constraint) {
    Throwable current = ex;
    while (current != null) {
      String message = current.getMessage();
      if (message != null && message.contains(constraint)) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Supplier was not found");
  }
}
