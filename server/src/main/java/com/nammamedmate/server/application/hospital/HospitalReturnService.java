package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.inventory.InventoryStockService;
import com.nammamedmate.server.domain.HospitalCreditAccount;
import com.nammamedmate.server.domain.HospitalIssue;
import com.nammamedmate.server.domain.HospitalIssueLine;
import com.nammamedmate.server.domain.HospitalLedgerEntry;
import com.nammamedmate.server.domain.HospitalLedgerKind;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.domain.HospitalReturn;
import com.nammamedmate.server.domain.HospitalReturnLine;
import com.nammamedmate.server.domain.HospitalWard;
import com.nammamedmate.server.domain.HospitalWardStock;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalIssueLineRepository;
import com.nammamedmate.server.persistence.HospitalIssueRepository;
import com.nammamedmate.server.persistence.HospitalLedgerEntryRepository;
import com.nammamedmate.server.persistence.HospitalReturnLineRepository;
import com.nammamedmate.server.persistence.HospitalReturnRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.HospitalWardStockRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalReturnService {

  private final HospitalArAccess access;
  private final HospitalIssueRepository issueRepository;
  private final HospitalIssueLineRepository issueLineRepository;
  private final HospitalReturnRepository returnRepository;
  private final HospitalReturnLineRepository returnLineRepository;
  private final HospitalWardStockRepository wardStockRepository;
  private final HospitalLedgerEntryRepository ledgerRepository;
  private final HospitalCreditAccountRepository accountRepository;
  private final HospitalWardRepository wardRepository;
  private final InventoryStockService inventoryStockService;
  private final AuditService auditService;
  private final Clock clock;

  public HospitalReturnService(
      HospitalArAccess access,
      HospitalIssueRepository issueRepository,
      HospitalIssueLineRepository issueLineRepository,
      HospitalReturnRepository returnRepository,
      HospitalReturnLineRepository returnLineRepository,
      HospitalWardStockRepository wardStockRepository,
      HospitalLedgerEntryRepository ledgerRepository,
      HospitalCreditAccountRepository accountRepository,
      HospitalWardRepository wardRepository,
      InventoryStockService inventoryStockService,
      AuditService auditService,
      Clock clock) {
    this.access = access;
    this.issueRepository = issueRepository;
    this.issueLineRepository = issueLineRepository;
    this.returnRepository = returnRepository;
    this.returnLineRepository = returnLineRepository;
    this.wardStockRepository = wardStockRepository;
    this.ledgerRepository = ledgerRepository;
    this.accountRepository = accountRepository;
    this.wardRepository = wardRepository;
    this.inventoryStockService = inventoryStockService;
    this.auditService = auditService;
    this.clock = clock;
  }

  @Transactional
  public HospitalReturnView create(AuthPrincipal principal, HospitalReturnCommand command) {
    HospitalArAccess.BranchContext ctx = access.requireStockReader(principal);
    if (command == null || command.issueId() == null || command.lines() == null) {
      throw shape();
    }
    String key = requireKey(command.idempotencyKey());
    return returnRepository
        .findByTenantIdAndIdempotencyKey(ctx.tenantId(), key)
        .map(existing -> toView(ctx, existing))
        .orElseGet(() -> persist(principal, ctx, command, key));
  }

  private HospitalReturnView persist(
      AuthPrincipal principal,
      HospitalArAccess.BranchContext ctx,
      HospitalReturnCommand command,
      String key) {
    HospitalIssue issue =
        issueRepository
            .lockByIdAndTenantIdAndBranchId(command.issueId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(HospitalPolicy::notFound);
    List<HospitalIssueLine> issueLines =
        issueLineRepository.findAllByIssueIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            issue.getId(), ctx.tenantId(), ctx.branchId());
    Map<UUID, BigDecimal> returnedByLine = returnedByLine(ctx, issueLines);
    Map<UUID, BigDecimal> requested = requestedByProduct(command.lines());
    Instant now = clock.instant();
    UUID returnId = UUID.randomUUID();
    List<HospitalReturnLine> savedLines = new ArrayList<>();
    long credit = 0L;
    int sort = 0;
    for (HospitalIssueLine issueLine : issueLines) {
      BigDecimal want = requested.getOrDefault(issueLine.getProductId(), BigDecimal.ZERO);
      if (want.compareTo(BigDecimal.ZERO) <= 0) {
        continue;
      }
      BigDecimal already = returnedByLine.getOrDefault(issueLine.getId(), BigDecimal.ZERO);
      BigDecimal remaining = issueLine.getQuantity().subtract(already);
      if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
        continue;
      }
      BigDecimal take = want.min(remaining);
      HospitalWardStock wardStock =
          wardStockRepository
              .lockByTenantIdAndBranchIdAndWardIdAndProductId(
                  ctx.tenantId(), ctx.branchId(), issue.getWardId(), issueLine.getProductId())
              .orElseThrow(
                  () ->
                      new ApiException(
                          HttpStatus.UNPROCESSABLE_ENTITY,
                          HospitalPolicy.OVER_RETURN,
                          HospitalPolicy.OVER_RETURN_MESSAGE));
      HospitalPolicy.assertReturnQty(take, remaining, wardStock.getQuantity());
      long amount = HospitalPolicy.lineAmountPaise(issueLine.getCreditPricePaise(), take);
      credit += amount;
      HospitalReturnLine line = new HospitalReturnLine();
      line.setId(UUID.randomUUID());
      line.setTenantId(ctx.tenantId());
      line.setBranchId(ctx.branchId());
      line.setReturnId(returnId);
      line.setIssueLineId(issueLine.getId());
      line.setProductId(issueLine.getProductId());
      line.setBatchId(issueLine.getBatchId());
      line.setQuantity(take);
      line.setCreditPricePaise(issueLine.getCreditPricePaise());
      line.setAmountPaise(amount);
      line.setSortOrder(sort++);
      line.setCreatedAt(now);
      savedLines.add(line);
      requested.put(issueLine.getProductId(), want.subtract(take));
      wardStock.setQuantity(wardStock.getQuantity().subtract(take));
      wardStock.setVersion(wardStock.getVersion() + 1);
      wardStock.setUpdatedAt(now);
      wardStockRepository.save(wardStock);
      inventoryStockService.restockHospitalReturn(
          principal,
          issueLine.getProductId(),
          issueLine.getBatchId(),
          take,
          "hospital-return:" + returnId + ":" + line.getId());
    }
    for (BigDecimal leftover : requested.values()) {
      if (leftover.compareTo(BigDecimal.ZERO) > 0) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            HospitalPolicy.OVER_RETURN,
            HospitalPolicy.OVER_RETURN_MESSAGE);
      }
    }
    if (savedLines.isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          HospitalPolicy.OVER_RETURN,
          HospitalPolicy.OVER_RETURN_MESSAGE);
    }
    HospitalCreditAccount account =
        accountRepository
            .lockByTenantId(ctx.tenantId())
            .orElseThrow(HospitalPolicy::accountRequired);
    HospitalReturn header = new HospitalReturn();
    header.setId(returnId);
    header.setTenantId(ctx.tenantId());
    header.setBranchId(ctx.branchId());
    header.setIssueId(issue.getId());
    header.setWardId(issue.getWardId());
    header.setCreditPaise(credit);
    header.setOccurredAt(now);
    header.setIdempotencyKey(key);
    header.setVersion(0L);
    header.setCreatedAt(now);
    header.setUpdatedAt(now);
    try {
      returnRepository.saveAndFlush(header);
    } catch (DataIntegrityViolationException ex) {
      return returnRepository
          .findByTenantIdAndIdempotencyKey(ctx.tenantId(), key)
          .map(existing -> toView(ctx, existing))
          .orElseThrow(() -> ex);
    }
    returnLineRepository.saveAll(savedLines);
    account.setBalancePaise(account.getBalancePaise() - credit);
    account.setVersion(account.getVersion() + 1);
    account.setUpdatedAt(now);
    accountRepository.save(account);
    HospitalLedgerEntry ledger = new HospitalLedgerEntry();
    ledger.setId(UUID.randomUUID());
    ledger.setTenantId(ctx.tenantId());
    ledger.setBranchId(ctx.branchId());
    ledger.setAccountId(account.getId());
    ledger.setKind(HospitalLedgerKind.RETURN);
    ledger.setDebitPaise(0L);
    ledger.setCreditPaise(credit);
    ledger.setIssueId(issue.getId());
    ledger.setReturnId(returnId);
    ledger.setParticulars("Return of " + issue.getInvoiceNumber());
    ledger.setOccurredAt(now);
    ledger.setIdempotencyKey("hospital-return:" + returnId);
    ledger.setCreatedAt(now);
    ledgerRepository.save(ledger);
    auditService.record(
        new AuditRecordCommand(
            ctx.user().getId(),
            ctx.tenantId(),
            ctx.branchId(),
            "HOSPITAL_RETURN_CREATE",
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"id\":\"" + returnId + "\"}"));
    return toView(header, issue, savedLines);
  }

  private Map<UUID, BigDecimal> returnedByLine(
      HospitalArAccess.BranchContext ctx, List<HospitalIssueLine> issueLines) {
    List<UUID> ids = issueLines.stream().map(HospitalIssueLine::getId).toList();
    Map<UUID, BigDecimal> out = new HashMap<>();
    if (ids.isEmpty()) {
      return out;
    }
    for (HospitalReturnLine line :
        returnLineRepository.findAllByTenantIdAndBranchIdAndIssueLineIdIn(
            ctx.tenantId(), ctx.branchId(), ids)) {
      out.merge(line.getIssueLineId(), line.getQuantity(), BigDecimal::add);
    }
    return out;
  }

  private Map<UUID, BigDecimal> requestedByProduct(List<HospitalReturnCommand.Line> lines) {
    if (lines.isEmpty()) {
      throw shape();
    }
    Map<UUID, BigDecimal> requested = new HashMap<>();
    for (HospitalReturnCommand.Line line : lines) {
      if (line == null || line.productId() == null || line.quantity() == null) {
        throw shape();
      }
      requested.merge(line.productId(), line.quantity(), BigDecimal::add);
    }
    return requested;
  }

  private HospitalReturnView toView(HospitalArAccess.BranchContext ctx, HospitalReturn header) {
    HospitalIssue issue =
        issueRepository
            .findByIdAndTenantIdAndBranchId(header.getIssueId(), ctx.tenantId(), ctx.branchId())
            .orElseThrow(HospitalPolicy::notFound);
    List<HospitalReturnLine> lines =
        returnLineRepository.findAllByReturnIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            header.getId(), ctx.tenantId(), ctx.branchId());
    return toView(header, issue, lines);
  }

  private HospitalReturnView toView(
      HospitalReturn header, HospitalIssue issue, List<HospitalReturnLine> lines) {
    String wardName =
        wardRepository
            .findByIdAndTenantIdAndBranchId(
                issue.getWardId(), issue.getTenantId(), issue.getBranchId())
            .map(HospitalWard::getName)
            .orElse("");
    Map<UUID, HospitalIssueLine> issueLines = new HashMap<>();
    for (HospitalIssueLine issueLine :
        issueLineRepository.findAllByIssueIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            issue.getId(), issue.getTenantId(), issue.getBranchId())) {
      issueLines.put(issueLine.getId(), issueLine);
    }
    return new HospitalReturnView(
        header.getId(),
        issue.getId(),
        issue.getInvoiceNumber(),
        issue.getWardId(),
        wardName,
        header.getCreditPaise(),
        header.getOccurredAt(),
        lines.stream()
            .map(
                line ->
                    new HospitalReturnView.Line(
                        line.getId(),
                        line.getProductId(),
                        issueLines.get(line.getIssueLineId()) == null
                            ? ""
                            : issueLines.get(line.getIssueLineId()).getProductName(),
                        line.getQuantity(),
                        line.getAmountPaise()))
            .toList());
  }

  private static String requireKey(String key) {
    if (key == null || key.isBlank() || key.length() > 80) {
      throw shape();
    }
    return key.trim();
  }

  private static ApiException shape() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }
}
