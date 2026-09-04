package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.StockTransfer;
import com.nammamedmate.server.domain.StockTransferDirection;
import com.nammamedmate.server.domain.StockTransferLine;
import com.nammamedmate.server.domain.StockTransferStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.StockTransferLineRepository;
import com.nammamedmate.server.persistence.StockTransferRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockTransferService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before managing transfers.";
  private static final List<StockTransferStatus> OPEN_OUTGOING =
      List.of(StockTransferStatus.REQUESTED, StockTransferStatus.IN_TRANSIT);
  private static final List<StockTransferStatus> OPEN_INCOMING =
      List.of(StockTransferStatus.REQUESTED, StockTransferStatus.IN_TRANSIT);
  private static final List<StockTransferStatus> HISTORY =
      List.of(
          StockTransferStatus.COMPLETED,
          StockTransferStatus.REJECTED,
          StockTransferStatus.CANCELLED);

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final LocationRepository locationRepository;
  private final ProductRepository productRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final StockMovementRepository stockMovementRepository;
  private final StockTransferRepository stockTransferRepository;
  private final StockTransferLineRepository stockTransferLineRepository;
  private final AuditService auditService;
  private final NotificationRoutingService notificationRoutingService;
  private final Clock clock;

  public StockTransferService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      LocationRepository locationRepository,
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      StockBalanceRepository stockBalanceRepository,
      StockMovementRepository stockMovementRepository,
      StockTransferRepository stockTransferRepository,
      StockTransferLineRepository stockTransferLineRepository,
      AuditService auditService,
      NotificationRoutingService notificationRoutingService,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.locationRepository = locationRepository;
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.stockTransferRepository = stockTransferRepository;
    this.stockTransferLineRepository = stockTransferLineRepository;
    this.auditService = auditService;
    this.notificationRoutingService = notificationRoutingService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public StockTransfersResult list(AuthPrincipal principal, String scope) {
    Context ctx = requireReady(principal);
    String normalized =
        scope == null || scope.isBlank() ? "all" : scope.trim().toLowerCase(Locale.ROOT);
    List<StockTransfer> rows =
        switch (normalized) {
          case "outgoing" ->
              stockTransferRepository.findOutgoingByStatuses(
                  ctx.tenantId(), ctx.branchId(), OPEN_OUTGOING);
          case "incoming" ->
              stockTransferRepository.findIncomingByStatuses(
                  ctx.tenantId(), ctx.branchId(), OPEN_INCOMING);
          case "history" ->
              stockTransferRepository.findHistoryByStatuses(
                  ctx.tenantId(), ctx.branchId(), HISTORY);
          case "all" -> stockTransferRepository.findAllForBranch(ctx.tenantId(), ctx.branchId());
          default -> throw validationError();
        };
    return new StockTransfersResult(toViews(ctx.tenantId(), rows));
  }

  @Transactional(readOnly = true)
  public StockTransferView get(AuthPrincipal principal, UUID transferId) {
    Context ctx = requireReady(principal);
    StockTransfer transfer = requireVisibleTransfer(ctx, transferId);
    return toView(ctx.tenantId(), transfer, loadLines(transfer.getId()));
  }

  @Transactional
  public StockTransferView create(AuthPrincipal principal, CreateStockTransferCommand command) {
    Context ctx = requireReady(principal);
    if (command == null
        || command.direction() == null
        || command.counterpartyBranchId() == null
        || command.lines() == null
        || command.lines().isEmpty()) {
      throw validationError();
    }
    String key = requireIdempotencyKey(command.idempotencyKey());
    Optional<StockTransfer> existing =
        stockTransferRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key);
    if (existing.isPresent()) {
      StockTransfer prior = existing.get();
      assertIdempotentCreate(prior, command, ctx);
      return toView(ctx.tenantId(), prior, loadLines(prior.getId()));
    }

    StockTransferDirection direction = parseDirection(command.direction());
    UUID fromBranchId;
    UUID toBranchId;
    if (direction == StockTransferDirection.PUSH) {
      fromBranchId = ctx.branchId();
      toBranchId = command.counterpartyBranchId();
    } else {
      toBranchId = ctx.branchId();
      fromBranchId = command.counterpartyBranchId();
    }
    if (fromBranchId.equals(toBranchId)) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "SAME_BRANCH",
          "Transfers must move stock between two different outlets.");
    }
    requireActiveBranch(ctx.tenantId(), fromBranchId);
    requireActiveBranch(ctx.tenantId(), toBranchId);

    Instant now = clock.instant();
    StockTransfer transfer = new StockTransfer();
    transfer.setId(UUID.randomUUID());
    transfer.setTenantId(ctx.tenantId());
    transfer.setFromBranchId(fromBranchId);
    transfer.setToBranchId(toBranchId);
    transfer.setDirection(direction);
    transfer.setStatus(
        direction == StockTransferDirection.PUSH
            ? StockTransferStatus.IN_TRANSIT
            : StockTransferStatus.REQUESTED);
    transfer.setIdempotencyKey(key);
    transfer.setCreatedByUserId(ctx.userId());
    if (direction == StockTransferDirection.PUSH) {
      transfer.setDispatchedByUserId(ctx.userId());
    }
    transfer.setVersion(0L);
    transfer.setCreatedAt(now);
    transfer.setUpdatedAt(now);

    List<StockTransferLine> lines = buildLines(ctx, transfer.getId(), command.lines(), now);
    try {
      stockTransferRepository.saveAndFlush(transfer);
      stockTransferLineRepository.saveAllAndFlush(lines);
    } catch (DataIntegrityViolationException ex) {
      return stockTransferRepository
          .findByTenantIdAndIdempotencyKey(ctx.tenantId(), key)
          .map(t -> toView(ctx.tenantId(), t, loadLines(t.getId())))
          .orElseThrow(() -> ex);
    }

    if (direction == StockTransferDirection.PUSH) {
      deductSender(ctx.tenantId(), fromBranchId, ctx.userId(), transfer.getId(), lines, now);
      notifyReceipt(transfer);
      audit(ctx, "STOCK_TRANSFER_PUSH", transfer.getId());
    } else {
      notifyRequested(transfer);
      audit(ctx, "STOCK_TRANSFER_PULL", transfer.getId());
    }
    return toView(ctx.tenantId(), transfer, lines);
  }

  @Transactional
  public StockTransferView dispatch(AuthPrincipal principal, UUID transferId) {
    Context ctx = requireReady(principal);
    StockTransfer transfer =
        stockTransferRepository
            .lockByIdAndTenantId(transferId, ctx.tenantId())
            .orElseThrow(this::notFound);
    if (!transfer.getFromBranchId().equals(ctx.branchId())) {
      throw forbidden();
    }
    if (transfer.getDirection() != StockTransferDirection.PULL) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INVALID_STATE",
          "Only pull requests need a sender dispatch.");
    }
    if (transfer.getStatus() != StockTransferStatus.REQUESTED) {
      throw staleState();
    }
    List<StockTransferLine> lines = loadLines(transfer.getId());
    Instant now = clock.instant();
    deductSender(
        ctx.tenantId(), transfer.getFromBranchId(), ctx.userId(), transfer.getId(), lines, now);
    transfer.setStatus(StockTransferStatus.IN_TRANSIT);
    transfer.setDispatchedByUserId(ctx.userId());
    transfer.setVersion(transfer.getVersion() + 1);
    transfer.setUpdatedAt(now);
    stockTransferRepository.saveAndFlush(transfer);
    notifyReceipt(transfer);
    audit(ctx, "STOCK_TRANSFER_DISPATCH", transfer.getId());
    return toView(ctx.tenantId(), transfer, lines);
  }

  @Transactional
  public StockTransferView confirm(AuthPrincipal principal, UUID transferId) {
    Context ctx = requireReady(principal);
    StockTransfer transfer =
        stockTransferRepository
            .lockByIdAndTenantId(transferId, ctx.tenantId())
            .orElseThrow(this::notFound);
    if (!transfer.getToBranchId().equals(ctx.branchId())) {
      throw forbidden();
    }
    if (transfer.getStatus() == StockTransferStatus.COMPLETED) {
      return toView(ctx.tenantId(), transfer, loadLines(transfer.getId()));
    }
    if (transfer.getStatus() != StockTransferStatus.IN_TRANSIT) {
      throw staleState();
    }
    List<StockTransferLine> lines = loadLines(transfer.getId());
    Instant now = clock.instant();
    creditReceiver(
        ctx.tenantId(), transfer.getToBranchId(), ctx.userId(), transfer.getId(), lines, now);
    transfer.setStatus(StockTransferStatus.COMPLETED);
    transfer.setConfirmedByUserId(ctx.userId());
    transfer.setVersion(transfer.getVersion() + 1);
    transfer.setUpdatedAt(now);
    stockTransferRepository.saveAndFlush(transfer);
    audit(ctx, "STOCK_TRANSFER_CONFIRM", transfer.getId());
    return toView(ctx.tenantId(), transfer, lines);
  }

  @Transactional
  public StockTransferView reject(AuthPrincipal principal, UUID transferId) {
    Context ctx = requireReady(principal);
    StockTransfer transfer =
        stockTransferRepository
            .lockByIdAndTenantId(transferId, ctx.tenantId())
            .orElseThrow(this::notFound);
    if (!transfer.getToBranchId().equals(ctx.branchId())) {
      throw forbidden();
    }
    if (transfer.getStatus() == StockTransferStatus.REJECTED) {
      return toView(ctx.tenantId(), transfer, loadLines(transfer.getId()));
    }
    if (transfer.getStatus() != StockTransferStatus.IN_TRANSIT) {
      throw staleState();
    }
    List<StockTransferLine> lines = loadLines(transfer.getId());
    Instant now = clock.instant();
    restoreSender(
        ctx.tenantId(), transfer.getFromBranchId(), ctx.userId(), transfer.getId(), lines, now);
    transfer.setStatus(StockTransferStatus.REJECTED);
    transfer.setRejectedByUserId(ctx.userId());
    transfer.setVersion(transfer.getVersion() + 1);
    transfer.setUpdatedAt(now);
    stockTransferRepository.saveAndFlush(transfer);
    audit(ctx, "STOCK_TRANSFER_REJECT", transfer.getId());
    return toView(ctx.tenantId(), transfer, lines);
  }

  @Transactional
  public StockTransferView cancel(AuthPrincipal principal, UUID transferId) {
    Context ctx = requireReady(principal);
    StockTransfer transfer =
        stockTransferRepository
            .lockByIdAndTenantId(transferId, ctx.tenantId())
            .orElseThrow(this::notFound);
    if (transfer.getStatus() == StockTransferStatus.CANCELLED) {
      return toView(ctx.tenantId(), transfer, loadLines(transfer.getId()));
    }
    if (transfer.getStatus() != StockTransferStatus.REQUESTED) {
      throw staleState();
    }
    boolean allowed =
        transfer.getFromBranchId().equals(ctx.branchId())
            || transfer.getToBranchId().equals(ctx.branchId())
            || transfer.getCreatedByUserId().equals(ctx.userId());
    if (!allowed) {
      throw forbidden();
    }
    Instant now = clock.instant();
    transfer.setStatus(StockTransferStatus.CANCELLED);
    transfer.setCancelledByUserId(ctx.userId());
    transfer.setVersion(transfer.getVersion() + 1);
    transfer.setUpdatedAt(now);
    stockTransferRepository.saveAndFlush(transfer);
    audit(ctx, "STOCK_TRANSFER_CANCEL", transfer.getId());
    return toView(ctx.tenantId(), transfer, loadLines(transfer.getId()));
  }

  private List<StockTransferLine> buildLines(
      Context ctx, UUID transferId, List<CreateStockTransferCommand.Line> input, Instant now) {
    List<StockTransferLine> lines = new ArrayList<>();
    for (CreateStockTransferCommand.Line line : input) {
      if (line == null || line.productId() == null || line.quantity() == null) {
        throw validationError();
      }
      Product product = requireProduct(line.productId(), ctx.tenantId());
      BigDecimal qty = requirePositiveQuantity(line.quantity(), product.getQuantityPrecision());
      UUID batchId = line.batchId();
      if (product.isRequiresBatchTracking()) {
        if (batchId == null) {
          throw validationError();
        }
        stockBatchRepository
            .findByIdAndTenantId(batchId, ctx.tenantId())
            .filter(b -> b.getProductId().equals(product.getId()))
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Batch was not found"));
      } else if (batchId != null) {
        throw validationError();
      }
      StockTransferLine row = new StockTransferLine();
      row.setId(UUID.randomUUID());
      row.setTransferId(transferId);
      row.setTenantId(ctx.tenantId());
      row.setProductId(product.getId());
      row.setBatchId(batchId);
      row.setQuantity(qty);
      row.setCreatedAt(now);
      lines.add(row);
    }
    return lines;
  }

  private void deductSender(
      UUID tenantId,
      UUID fromBranchId,
      UUID userId,
      UUID transferId,
      List<StockTransferLine> lines,
      Instant now) {
    for (StockTransferLine line : lines) {
      StockBalance balance =
          lockBalance(tenantId, fromBranchId, line.getProductId(), line.getBatchId())
              .orElseThrow(this::insufficientStock);
      if (balance.getQuantity().compareTo(line.getQuantity()) < 0) {
        throw insufficientStock();
      }
      BigDecimal next = balance.getQuantity().subtract(line.getQuantity());
      balance.setQuantity(next);
      balance.setVersion(balance.getVersion() + 1);
      balance.setUpdatedAt(now);
      stockBalanceRepository.saveAndFlush(balance);
      Long price = purchasePrice(tenantId, line.getBatchId());
      stockMovementRepository.saveAndFlush(
          newMovement(
              tenantId,
              fromBranchId,
              userId,
              line.getProductId(),
              line.getBatchId(),
              balance.getId(),
              StockMovementType.TRANSFER_OUT,
              line.getQuantity(),
              next,
              price,
              "xfer-out:" + transferId + ":" + line.getId(),
              now));
    }
  }

  private void creditReceiver(
      UUID tenantId,
      UUID toBranchId,
      UUID userId,
      UUID transferId,
      List<StockTransferLine> lines,
      Instant now) {
    for (StockTransferLine line : lines) {
      StockBalance balance =
          lockOrCreateBalance(tenantId, toBranchId, line.getProductId(), line.getBatchId(), now);
      BigDecimal next = balance.getQuantity().add(line.getQuantity());
      balance.setQuantity(next);
      balance.setVersion(balance.getVersion() + 1);
      balance.setUpdatedAt(now);
      stockBalanceRepository.saveAndFlush(balance);
      Long price = purchasePrice(tenantId, line.getBatchId());
      stockMovementRepository.saveAndFlush(
          newMovement(
              tenantId,
              toBranchId,
              userId,
              line.getProductId(),
              line.getBatchId(),
              balance.getId(),
              StockMovementType.TRANSFER_IN,
              line.getQuantity(),
              next,
              price,
              "xfer-in:" + transferId + ":" + line.getId(),
              now));
    }
  }

  private void restoreSender(
      UUID tenantId,
      UUID fromBranchId,
      UUID userId,
      UUID transferId,
      List<StockTransferLine> lines,
      Instant now) {
    for (StockTransferLine line : lines) {
      StockBalance balance =
          lockOrCreateBalance(tenantId, fromBranchId, line.getProductId(), line.getBatchId(), now);
      BigDecimal next = balance.getQuantity().add(line.getQuantity());
      balance.setQuantity(next);
      balance.setVersion(balance.getVersion() + 1);
      balance.setUpdatedAt(now);
      stockBalanceRepository.saveAndFlush(balance);
      Long price = purchasePrice(tenantId, line.getBatchId());
      stockMovementRepository.saveAndFlush(
          newMovement(
              tenantId,
              fromBranchId,
              userId,
              line.getProductId(),
              line.getBatchId(),
              balance.getId(),
              StockMovementType.TRANSFER_IN,
              line.getQuantity(),
              next,
              price,
              "xfer-restore:" + transferId + ":" + line.getId(),
              now));
    }
  }

  private StockBalance lockOrCreateBalance(
      UUID tenantId, UUID branchId, UUID productId, UUID batchId, Instant now) {
    Optional<StockBalance> locked = lockBalance(tenantId, branchId, productId, batchId);
    if (locked.isPresent()) {
      return locked.get();
    }
    StockBalance balance = new StockBalance();
    balance.setId(UUID.randomUUID());
    balance.setTenantId(tenantId);
    balance.setBranchId(branchId);
    balance.setProductId(productId);
    balance.setBatchId(batchId);
    balance.setQuantity(BigDecimal.ZERO);
    balance.setVersion(0L);
    balance.setCreatedAt(now);
    balance.setUpdatedAt(now);
    return stockBalanceRepository.saveAndFlush(balance);
  }

  private Optional<StockBalance> lockBalance(
      UUID tenantId, UUID branchId, UUID productId, UUID batchId) {
    if (batchId == null) {
      return stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
          tenantId, branchId, productId);
    }
    return stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchId(
        tenantId, branchId, productId, batchId);
  }

  private Long purchasePrice(UUID tenantId, UUID batchId) {
    if (batchId == null) {
      return null;
    }
    return stockBatchRepository
        .findByIdAndTenantId(batchId, tenantId)
        .map(StockBatch::getPurchasePricePaise)
        .orElse(null);
  }

  private StockMovement newMovement(
      UUID tenantId,
      UUID branchId,
      UUID userId,
      UUID productId,
      UUID batchId,
      UUID balanceId,
      StockMovementType type,
      BigDecimal quantity,
      BigDecimal balanceAfter,
      Long purchasePricePaise,
      String idempotencyKey,
      Instant now) {
    StockMovement movement = new StockMovement();
    movement.setId(UUID.randomUUID());
    movement.setTenantId(tenantId);
    movement.setBranchId(branchId);
    movement.setProductId(productId);
    movement.setBatchId(batchId);
    movement.setBalanceId(balanceId);
    movement.setType(type);
    movement.setQuantity(quantity);
    movement.setBalanceAfter(balanceAfter);
    movement.setPurchasePricePaise(purchasePricePaise);
    movement.setIdempotencyKey(idempotencyKey);
    movement.setCreatedByUserId(userId);
    movement.setOccurredAt(now);
    movement.setCreatedAt(now);
    return movement;
  }

  private void notifyRequested(StockTransfer transfer) {
    notificationRoutingService.route(
        new RouteCommand(
            "transfer-requested:" + transfer.getId(),
            NotificationTrigger.TRANSFER_REQUESTED,
            transfer.getTenantId(),
            transfer.getFromBranchId(),
            transfer.getId(),
            null,
            null,
            null));
  }

  private void notifyReceipt(StockTransfer transfer) {
    notificationRoutingService.route(
        new RouteCommand(
            "transfer-receipt:" + transfer.getId(),
            NotificationTrigger.TRANSFER_RECEIPT,
            transfer.getTenantId(),
            transfer.getToBranchId(),
            transfer.getId(),
            null,
            null,
            null));
  }

  private void audit(Context ctx, String action, UUID transferId) {
    auditService.record(
        new AuditRecordCommand(
            ctx.userId(),
            ctx.tenantId(),
            ctx.branchId(),
            action,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            null,
            "{\"transferId\":\"" + transferId + "\"}"));
  }

  private void assertIdempotentCreate(
      StockTransfer prior, CreateStockTransferCommand command, Context ctx) {
    StockTransferDirection direction = parseDirection(command.direction());
    UUID expectedFrom =
        direction == StockTransferDirection.PUSH ? ctx.branchId() : command.counterpartyBranchId();
    UUID expectedTo =
        direction == StockTransferDirection.PUSH ? command.counterpartyBranchId() : ctx.branchId();
    if (prior.getDirection() != direction
        || !prior.getFromBranchId().equals(expectedFrom)
        || !prior.getToBranchId().equals(expectedTo)) {
      throw idempotencyConflict();
    }
    List<StockTransferLine> lines = loadLines(prior.getId());
    if (lines.size() != command.lines().size()) {
      throw idempotencyConflict();
    }
    for (int i = 0; i < lines.size(); i++) {
      StockTransferLine line = lines.get(i);
      CreateStockTransferCommand.Line input = command.lines().get(i);
      if (!line.getProductId().equals(input.productId())
          || !Objects.equals(line.getBatchId(), input.batchId())
          || line.getQuantity().compareTo(input.quantity()) != 0) {
        throw idempotencyConflict();
      }
    }
  }

  private StockTransfer requireVisibleTransfer(Context ctx, UUID transferId) {
    StockTransfer transfer =
        stockTransferRepository
            .findByIdAndTenantId(transferId, ctx.tenantId())
            .orElseThrow(this::notFound);
    if (!transfer.getFromBranchId().equals(ctx.branchId())
        && !transfer.getToBranchId().equals(ctx.branchId())) {
      throw notFound();
    }
    return transfer;
  }

  private List<StockTransferView> toViews(UUID tenantId, List<StockTransfer> rows) {
    if (rows.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = rows.stream().map(StockTransfer::getId).toList();
    Map<UUID, List<StockTransferLine>> byTransfer = new HashMap<>();
    for (StockTransferLine line : stockTransferLineRepository.findAllByTransferIdIn(ids)) {
      byTransfer.computeIfAbsent(line.getTransferId(), ignored -> new ArrayList<>()).add(line);
    }
    List<StockTransferView> views = new ArrayList<>();
    for (StockTransfer transfer : rows) {
      views.add(toView(tenantId, transfer, byTransfer.getOrDefault(transfer.getId(), List.of())));
    }
    return views;
  }

  private StockTransferView toView(
      UUID tenantId, StockTransfer transfer, List<StockTransferLine> lines) {
    Map<UUID, Product> products = new HashMap<>();
    List<StockTransferLineView> lineViews = new ArrayList<>();
    for (StockTransferLine line : lines) {
      Product product =
          products.computeIfAbsent(line.getProductId(), id -> requireProduct(id, tenantId));
      lineViews.add(
          new StockTransferLineView(
              line.getId(),
              product.getId(),
              product.getSku(),
              product.getName(),
              line.getBatchId(),
              line.getQuantity()));
    }
    return new StockTransferView(
        transfer.getId(),
        transfer.getFromBranchId(),
        transfer.getToBranchId(),
        transfer.getDirection().name(),
        transfer.getStatus().name(),
        lineViews,
        transfer.getVersion(),
        transfer.getCreatedAt(),
        transfer.getUpdatedAt());
  }

  private List<StockTransferLine> loadLines(UUID transferId) {
    return stockTransferLineRepository.findAllByTransferIdOrderByCreatedAtAsc(transferId);
  }

  private void requireActiveBranch(UUID tenantId, UUID branchId) {
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Outlet was not found"));
    if (branch.getStatus() != BranchStatus.ACTIVE) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_INACTIVE", "Outlet is not active.");
    }
  }

  private StockTransferDirection parseDirection(String raw) {
    if (raw == null || raw.isBlank()) {
      throw validationError();
    }
    try {
      return StockTransferDirection.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw validationError();
    }
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireInventoryAccess(principal);
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId, principal.userId());
  }

  private UUID requireInventoryAccess(AuthPrincipal principal) {
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
            .orElseThrow(StockTransferService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.INVENTORY)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private Product requireProduct(UUID productId, UUID tenantId) {
    return productRepository
        .findByIdAndTenantId(productId, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Product was not found"));
  }

  private static BigDecimal requirePositiveQuantity(BigDecimal quantity, int precision) {
    if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
      throw validationError();
    }
    BigDecimal normalized = quantity.stripTrailingZeros();
    int scale = Math.max(normalized.scale(), 0);
    if (scale > precision) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "PRECISION_LOSS",
          "Quantity exceeds the product allowed precision.");
    }
    return normalized;
  }

  private static String requireIdempotencyKey(String key) {
    if (key == null || key.isBlank() || key.length() > 128) {
      throw validationError();
    }
    return key.trim();
  }

  private static ApiException validationError() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private ApiException idempotencyConflict() {
    return new ApiException(
        HttpStatus.CONFLICT,
        "IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payload");
  }

  private ApiException staleState() {
    return new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Transfer state is stale.");
  }

  private ApiException insufficientStock() {
    return new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "INSUFFICIENT_STOCK",
        "Not enough stock for this transfer.");
  }

  private ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Transfer was not found");
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private record Context(UUID tenantId, UUID branchId, UUID userId) {}
}
