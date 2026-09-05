package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.application.compliance.ControlledStockRecorder;
import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchProductStockLevel;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.BranchProductStockLevelRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.StringJoiner;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryStockService {

  private static final String NO_BRANCH_CODE = "NO_ACTIVE_BRANCH";
  private static final String NO_BRANCH_MESSAGE = "Select an outlet before managing floor stock.";

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final ProductRepository productRepository;
  private final StockBatchRepository stockBatchRepository;
  private final StockBalanceRepository stockBalanceRepository;
  private final StockMovementRepository stockMovementRepository;
  private final LocationRepository locationRepository;
  private final BranchProductStockLevelRepository branchProductStockLevelRepository;
  private final NotificationRoutingService notificationRoutingService;
  private final ControlledStockRecorder controlledStockRecorder;
  private final Clock clock;

  public InventoryStockService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      StockBalanceRepository stockBalanceRepository,
      StockMovementRepository stockMovementRepository,
      LocationRepository locationRepository,
      BranchProductStockLevelRepository branchProductStockLevelRepository,
      NotificationRoutingService notificationRoutingService,
      ControlledStockRecorder controlledStockRecorder,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.locationRepository = locationRepository;
    this.branchProductStockLevelRepository = branchProductStockLevelRepository;
    this.notificationRoutingService = notificationRoutingService;
    this.controlledStockRecorder = controlledStockRecorder;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public StockBalancesResult listBalances(AuthPrincipal principal, String query) {
    Context ctx = requireReady(principal);
    String needle = query == null ? "" : query.trim().toLowerCase();
    List<StockBalance> balances =
        stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
            ctx.tenantId(), ctx.branchId());
    Map<UUID, Product> products = loadProducts(ctx.tenantId(), balances);
    Map<UUID, StockBatch> batches = loadBatches(ctx.tenantId(), balances);
    List<StockBalanceView> items = new ArrayList<>();
    for (StockBalance balance : balances) {
      Product product = products.get(balance.getProductId());
      if (product == null) {
        continue;
      }
      if (!needle.isEmpty()
          && !product.getName().toLowerCase().contains(needle)
          && !product.getSku().toLowerCase().contains(needle)) {
        continue;
      }
      StockBatch batch = balance.getBatchId() == null ? null : batches.get(balance.getBatchId());
      items.add(toBalanceView(balance, product, batch));
    }
    items.sort(
        Comparator.comparing(StockBalanceView::productName, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(
                v -> v.batchNumber() == null ? "" : v.batchNumber(),
                String.CASE_INSENSITIVE_ORDER));
    return new StockBalancesResult(items);
  }

  @Transactional(readOnly = true)
  public StockBatchesResult listBatches(AuthPrincipal principal, UUID productId) {
    Context ctx = requireReadyForBatches(principal);
    Product product = requireProduct(productId, ctx.tenantId());
    int warnDays = expiryWarnDays(ctx);
    LocalDate today = today();
    List<StockBalance> balances =
        stockBalanceRepository.findAllByTenantIdAndBranchIdAndProductId(
            ctx.tenantId(), ctx.branchId(), productId);
    List<StockBatchDetailView> items = new ArrayList<>();
    for (StockBalance balance : balances) {
      if (balance.getBatchId() == null) {
        items.add(
            new StockBatchDetailView(
                null,
                product.getId(),
                null,
                null,
                null,
                0L,
                balance.getQuantity(),
                balance.getVersion(),
                balance.getId(),
                false,
                false,
                false));
        continue;
      }
      StockBatch batch =
          stockBatchRepository
              .findByIdAndTenantId(balance.getBatchId(), ctx.tenantId())
              .orElse(null);
      if (batch == null) {
        continue;
      }
      boolean expired = isExpired(batch.getExpiresOn(), today);
      boolean near = isNearExpiry(batch.getExpiresOn(), today, warnDays);
      items.add(
          new StockBatchDetailView(
              batch.getId(),
              product.getId(),
              batch.getBatchNumber(),
              batch.getManufacturedOn(),
              batch.getExpiresOn(),
              batch.getPurchasePricePaise(),
              balance.getQuantity(),
              balance.getVersion(),
              balance.getId(),
              false,
              near,
              expired));
    }
    items.sort(
        Comparator.comparing(
                (StockBatchDetailView v) -> v.expiresOn() == null ? LocalDate.MAX : v.expiresOn())
            .thenComparing(v -> v.batchNumber() == null ? "" : v.batchNumber()));
    UUID suggestedId = null;
    for (StockBatchDetailView item : items) {
      if (item.batchId() != null
          && !item.expired()
          && item.quantity().compareTo(BigDecimal.ZERO) > 0) {
        suggestedId = item.batchId();
        break;
      }
    }
    if (suggestedId != null) {
      List<StockBatchDetailView> flagged = new ArrayList<>();
      for (StockBatchDetailView item : items) {
        flagged.add(
            new StockBatchDetailView(
                item.batchId(),
                item.productId(),
                item.batchNumber(),
                item.manufacturedOn(),
                item.expiresOn(),
                item.purchasePricePaise(),
                item.quantity(),
                item.version(),
                item.balanceId(),
                Objects.equals(item.batchId(), suggestedId),
                item.nearExpiry(),
                item.expired()));
      }
      items = flagged;
    }
    return new StockBatchesResult(items);
  }

  @Transactional(readOnly = true)
  public StockMovementsResult listMovements(AuthPrincipal principal, UUID productId, UUID batchId) {
    Context ctx = requireReady(principal);
    if (productId != null) {
      requireProduct(productId, ctx.tenantId());
    }
    if (batchId != null) {
      stockBatchRepository
          .findByIdAndTenantId(batchId, ctx.tenantId())
          .orElseThrow(
              () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Batch was not found"));
    }
    List<StockMovementView> items =
        stockMovementRepository
            .findFiltered(ctx.tenantId(), ctx.branchId(), productId, batchId)
            .stream()
            .map(this::toMovementView)
            .toList();
    return new StockMovementsResult(items);
  }

  @Transactional
  public StockBalanceView receive(
      AuthPrincipal principal,
      UUID productId,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      Long purchasePricePaise,
      BigDecimal quantity,
      String idempotencyKey,
      Long expectedVersion) {
    Context ctx = requireReady(principal);
    Product product = requireProduct(productId, ctx.tenantId());
    BigDecimal qty = requirePositiveQuantity(quantity, product.getQuantityPrecision());
    String key = requireIdempotencyKey(idempotencyKey);

    Optional<StockMovement> existing =
        stockMovementRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key);
    if (existing.isPresent()) {
      StockMovement prior = existing.get();
      assertIdempotentReceipt(
          prior, productId, batchNumber, manufacturedOn, expiresOn, purchasePricePaise, qty);
      return loadBalanceView(ctx, prior.getBalanceId());
    }

    UUID batchId =
        resolveBatchForReceipt(
            ctx, product, batchNumber, manufacturedOn, expiresOn, purchasePricePaise);

    StockBalance balance = lockOrCreateBalance(ctx, productId, batchId, expectedVersion);
    BigDecimal next = balance.getQuantity().add(qty);
    Instant now = clock.instant();
    balance.setQuantity(next);
    balance.setVersion(balance.getVersion() + 1);
    balance.setUpdatedAt(now);
    stockBalanceRepository.saveAndFlush(balance);

    StockMovement movement =
        newMovement(
            ctx,
            productId,
            batchId,
            balance.getId(),
            StockMovementType.STOCK_IN,
            qty,
            next,
            batchId == null
                ? purchasePricePaise
                : stockBatchRepository
                    .findByIdAndTenantId(batchId, ctx.tenantId())
                    .map(StockBatch::getPurchasePricePaise)
                    .orElse(purchasePricePaise),
            key,
            now);
    stockMovementRepository.saveAndFlush(movement);
    controlledStockRecorder.record(movement);
    return loadBalanceView(ctx, balance.getId());
  }

  @Transactional
  public StockBalanceView issue(
      AuthPrincipal principal,
      UUID productId,
      UUID batchId,
      BigDecimal quantity,
      String idempotencyKey,
      Long expectedVersion) {
    return issueWithContext(
        requireReady(principal), productId, batchId, quantity, idempotencyKey, expectedVersion);
  }

  @Transactional
  public StockBalanceView issueForSale(
      AuthPrincipal principal,
      UUID productId,
      UUID batchId,
      BigDecimal quantity,
      String idempotencyKey,
      Long expectedVersion) {
    return issueWithContext(
        requireReadyForSale(principal),
        productId,
        batchId,
        quantity,
        idempotencyKey,
        expectedVersion);
  }

  private StockBalanceView issueWithContext(
      Context ctx,
      UUID productId,
      UUID batchId,
      BigDecimal quantity,
      String idempotencyKey,
      Long expectedVersion) {
    Product product = requireProduct(productId, ctx.tenantId());
    BigDecimal qty = requirePositiveQuantity(quantity, product.getQuantityPrecision());
    String key = requireIdempotencyKey(idempotencyKey);

    Optional<StockMovement> existing =
        stockMovementRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key);
    if (existing.isPresent()) {
      StockMovement prior = existing.get();
      assertIdempotentIssue(prior, productId, batchId, qty);
      return loadBalanceView(ctx, prior.getBalanceId());
    }

    if (product.isRequiresBatchTracking()) {
      if (batchId == null) {
        throw validationError();
      }
      StockBatch batch =
          stockBatchRepository
              .findByIdAndTenantId(batchId, ctx.tenantId())
              .filter(b -> b.getProductId().equals(productId))
              .orElseThrow(
                  () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Batch was not found"));
      if (isExpired(batch.getExpiresOn(), today())) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "BATCH_EXPIRED",
            "Expired batches cannot be issued for sale.");
      }
    } else if (batchId != null) {
      throw validationError();
    }

    StockBalance balance =
        lockBalance(ctx, productId, batchId)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "INSUFFICIENT_STOCK",
                        "Not enough stock for this issue."));
    assertExpectedVersion(balance, expectedVersion);
    if (balance.getQuantity().compareTo(qty) < 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INSUFFICIENT_STOCK",
          "Not enough stock for this issue.");
    }

    Instant now = clock.instant();
    BigDecimal next = balance.getQuantity().subtract(qty);
    balance.setQuantity(next);
    balance.setVersion(balance.getVersion() + 1);
    balance.setUpdatedAt(now);
    stockBalanceRepository.saveAndFlush(balance);

    Long price =
        batchId == null
            ? null
            : stockBatchRepository
                .findByIdAndTenantId(batchId, ctx.tenantId())
                .map(StockBatch::getPurchasePricePaise)
                .orElse(null);
    StockMovement movement =
        newMovement(
            ctx,
            productId,
            batchId,
            balance.getId(),
            StockMovementType.STOCK_OUT,
            qty,
            next,
            price,
            key,
            now);
    stockMovementRepository.saveAndFlush(movement);
    controlledStockRecorder.record(movement);
    maybeNotifyLowStock(ctx, product);
    return loadBalanceView(ctx, balance.getId());
  }

  @Transactional
  public StockBalanceView returnToSupplier(
      AuthPrincipal principal,
      UUID productId,
      UUID batchId,
      BigDecimal quantity,
      String idempotencyKey,
      Long expectedVersion) {
    Context ctx = requireReadyForReturn(principal);
    Product product = requireProduct(productId, ctx.tenantId());
    BigDecimal qty = requirePositiveQuantity(quantity, product.getQuantityPrecision());
    String key = requireIdempotencyKey(idempotencyKey);

    Optional<StockMovement> existing =
        stockMovementRepository.findByTenantIdAndIdempotencyKey(ctx.tenantId(), key);
    if (existing.isPresent()) {
      StockMovement prior = existing.get();
      assertIdempotentPurchaseReturn(prior, productId, batchId, qty);
      return loadBalanceView(ctx, prior.getBalanceId());
    }

    if (product.isRequiresBatchTracking()) {
      if (batchId == null) {
        throw validationError();
      }
      stockBatchRepository
          .findByIdAndTenantId(batchId, ctx.tenantId())
          .filter(b -> b.getProductId().equals(productId))
          .orElseThrow(
              () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Batch was not found"));
    } else if (batchId != null) {
      throw validationError();
    }

    StockBalance balance =
        lockBalance(ctx, productId, batchId)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "INSUFFICIENT_STOCK",
                        "Not enough stock for this return."));
    if (expectedVersion != null) {
      assertExpectedVersion(balance, expectedVersion);
    }
    if (balance.getQuantity().compareTo(qty) < 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "INSUFFICIENT_STOCK",
          "Not enough stock for this return.");
    }

    Instant now = clock.instant();
    BigDecimal next = balance.getQuantity().subtract(qty);
    balance.setQuantity(next);
    balance.setVersion(balance.getVersion() + 1);
    balance.setUpdatedAt(now);
    stockBalanceRepository.saveAndFlush(balance);

    Long price =
        batchId == null
            ? null
            : stockBatchRepository
                .findByIdAndTenantId(batchId, ctx.tenantId())
                .map(StockBatch::getPurchasePricePaise)
                .orElse(null);
    StockMovement movement =
        newMovement(
            ctx,
            productId,
            batchId,
            balance.getId(),
            StockMovementType.PURCHASE_RETURN,
            qty,
            next,
            price,
            key,
            now);
    stockMovementRepository.saveAndFlush(movement);
    controlledStockRecorder.record(movement);
    maybeNotifyLowStock(ctx, product);
    return loadBalanceView(ctx, balance.getId());
  }

  private UUID resolveBatchForReceipt(
      Context ctx,
      Product product,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      Long purchasePricePaise) {
    if (!product.isRequiresBatchTracking()) {
      if (batchNumber != null && !batchNumber.isBlank()) {
        throw validationError();
      }
      return null;
    }
    String number = requireBatchNumber(batchNumber);
    if (product.isRequiresExpiryTracking() && expiresOn == null) {
      throw validationError();
    }
    if (manufacturedOn != null && expiresOn != null && manufacturedOn.isAfter(expiresOn)) {
      throw validationError();
    }
    if (purchasePricePaise == null || purchasePricePaise < 0) {
      throw validationError();
    }

    Optional<StockBatch> existing =
        stockBatchRepository.findByTenantIdAndProductIdAndBatchNumber(
            ctx.tenantId(), product.getId(), number);
    if (existing.isPresent()) {
      StockBatch batch = existing.get();
      if (!Objects.equals(batch.getManufacturedOn(), manufacturedOn)
          || !Objects.equals(batch.getExpiresOn(), expiresOn)
          || batch.getPurchasePricePaise() != purchasePricePaise) {
        throw new ApiException(
            HttpStatus.CONFLICT,
            "BATCH_IDENTITY_CONFLICT",
            "Batch identity does not match existing batch.");
      }
      return batch.getId();
    }

    Instant now = clock.instant();
    StockBatch batch = new StockBatch();
    batch.setId(UUID.randomUUID());
    batch.setTenantId(ctx.tenantId());
    batch.setProductId(product.getId());
    batch.setBatchNumber(number);
    batch.setManufacturedOn(manufacturedOn);
    batch.setExpiresOn(expiresOn);
    batch.setPurchasePricePaise(purchasePricePaise);
    batch.setCreatedAt(now);
    batch.setUpdatedAt(now);
    return stockBatchRepository.saveAndFlush(batch).getId();
  }

  private StockBalance lockOrCreateBalance(
      Context ctx, UUID productId, UUID batchId, Long expectedVersion) {
    Optional<StockBalance> locked = lockBalance(ctx, productId, batchId);
    if (locked.isPresent()) {
      StockBalance balance = locked.get();
      if (expectedVersion != null) {
        assertExpectedVersion(balance, expectedVersion);
      }
      return balance;
    }
    if (expectedVersion != null && expectedVersion != 0L) {
      throw new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Stock version is stale.");
    }
    Instant now = clock.instant();
    StockBalance balance = new StockBalance();
    balance.setId(UUID.randomUUID());
    balance.setTenantId(ctx.tenantId());
    balance.setBranchId(ctx.branchId());
    balance.setProductId(productId);
    balance.setBatchId(batchId);
    balance.setQuantity(BigDecimal.ZERO);
    balance.setVersion(0L);
    balance.setCreatedAt(now);
    balance.setUpdatedAt(now);
    return stockBalanceRepository.saveAndFlush(balance);
  }

  private Optional<StockBalance> lockBalance(Context ctx, UUID productId, UUID batchId) {
    if (batchId == null) {
      return stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchIdIsNull(
          ctx.tenantId(), ctx.branchId(), productId);
    }
    return stockBalanceRepository.lockByTenantIdAndBranchIdAndProductIdAndBatchId(
        ctx.tenantId(), ctx.branchId(), productId, batchId);
  }

  private void assertExpectedVersion(StockBalance balance, Long expectedVersion) {
    if (expectedVersion == null || balance.getVersion() != expectedVersion) {
      throw new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Stock version is stale.");
    }
  }

  private void assertIdempotentReceipt(
      StockMovement prior,
      UUID productId,
      String batchNumber,
      LocalDate manufacturedOn,
      LocalDate expiresOn,
      Long purchasePricePaise,
      BigDecimal qty) {
    if (prior.getType() != StockMovementType.STOCK_IN
        || !prior.getProductId().equals(productId)
        || prior.getQuantity().compareTo(qty) != 0) {
      throw idempotencyConflict();
    }
    if (prior.getBatchId() == null) {
      if (batchNumber != null && !batchNumber.isBlank()) {
        throw idempotencyConflict();
      }
      return;
    }
    StockBatch batch =
        stockBatchRepository
            .findByIdAndTenantId(prior.getBatchId(), prior.getTenantId())
            .orElseThrow(this::idempotencyConflict);
    if (!batch.getBatchNumber().equals(normalizeBatchNumber(batchNumber))
        || !Objects.equals(batch.getManufacturedOn(), manufacturedOn)
        || !Objects.equals(batch.getExpiresOn(), expiresOn)
        || (purchasePricePaise != null && batch.getPurchasePricePaise() != purchasePricePaise)) {
      throw idempotencyConflict();
    }
  }

  private void assertIdempotentIssue(
      StockMovement prior, UUID productId, UUID batchId, BigDecimal qty) {
    if (prior.getType() != StockMovementType.STOCK_OUT
        || !prior.getProductId().equals(productId)
        || prior.getQuantity().compareTo(qty) != 0
        || !Objects.equals(prior.getBatchId(), batchId)) {
      throw idempotencyConflict();
    }
  }

  private void assertIdempotentPurchaseReturn(
      StockMovement prior, UUID productId, UUID batchId, BigDecimal qty) {
    if (prior.getType() != StockMovementType.PURCHASE_RETURN
        || !prior.getProductId().equals(productId)
        || prior.getQuantity().compareTo(qty) != 0
        || !Objects.equals(prior.getBatchId(), batchId)) {
      throw idempotencyConflict();
    }
  }

  private StockBalanceView loadBalanceView(Context ctx, UUID balanceId) {
    StockBalance balance =
        stockBalanceRepository
            .findById(balanceId)
            .filter(b -> b.getTenantId().equals(ctx.tenantId()))
            .filter(b -> b.getBranchId().equals(ctx.branchId()))
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Balance was not found"));
    Product product = requireProduct(balance.getProductId(), ctx.tenantId());
    StockBatch batch =
        balance.getBatchId() == null
            ? null
            : stockBatchRepository
                .findByIdAndTenantId(balance.getBatchId(), ctx.tenantId())
                .orElse(null);
    return toBalanceView(balance, product, batch);
  }

  private StockMovement newMovement(
      Context ctx,
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
    movement.setTenantId(ctx.tenantId());
    movement.setBranchId(ctx.branchId());
    movement.setProductId(productId);
    movement.setBatchId(batchId);
    movement.setBalanceId(balanceId);
    movement.setType(type);
    movement.setQuantity(quantity);
    movement.setBalanceAfter(balanceAfter);
    movement.setPurchasePricePaise(purchasePricePaise);
    movement.setIdempotencyKey(idempotencyKey);
    movement.setCreatedByUserId(ctx.userId());
    movement.setOccurredAt(now);
    movement.setCreatedAt(now);
    return movement;
  }

  private Map<UUID, Product> loadProducts(UUID tenantId, List<StockBalance> balances) {
    Map<UUID, Product> map = new HashMap<>();
    for (StockBalance balance : balances) {
      if (map.containsKey(balance.getProductId())) {
        continue;
      }
      productRepository
          .findByIdAndTenantId(balance.getProductId(), tenantId)
          .ifPresent(p -> map.put(p.getId(), p));
    }
    return map;
  }

  private Map<UUID, StockBatch> loadBatches(UUID tenantId, List<StockBalance> balances) {
    Map<UUID, StockBatch> map = new HashMap<>();
    for (StockBalance balance : balances) {
      if (balance.getBatchId() == null || map.containsKey(balance.getBatchId())) {
        continue;
      }
      stockBatchRepository
          .findByIdAndTenantId(balance.getBatchId(), tenantId)
          .ifPresent(b -> map.put(b.getId(), b));
    }
    return map;
  }

  private StockBalanceView toBalanceView(StockBalance balance, Product product, StockBatch batch) {
    boolean near =
        batch != null
            && isNearExpiry(
                batch.getExpiresOn(),
                today(),
                expiryWarnDaysForBranch(balance.getTenantId(), balance.getBranchId()));
    return new StockBalanceView(
        balance.getId(),
        product.getId(),
        product.getSku(),
        product.getName(),
        batch == null ? null : batch.getId(),
        batch == null ? null : batch.getBatchNumber(),
        batch == null ? null : batch.getManufacturedOn(),
        batch == null ? null : batch.getExpiresOn(),
        batch == null ? null : batch.getPurchasePricePaise(),
        balance.getQuantity(),
        balance.getVersion(),
        near);
  }

  private StockMovementView toMovementView(StockMovement movement) {
    return new StockMovementView(
        movement.getId(),
        movement.getProductId(),
        movement.getBatchId(),
        movement.getType().name(),
        movement.getQuantity(),
        movement.getBalanceAfter(),
        movement.getPurchasePricePaise(),
        movement.getOccurredAt());
  }

  @Transactional(readOnly = true)
  public InventorySettingsView getSettings(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    return new InventorySettingsView(expiryWarnDays(ctx));
  }

  @Transactional
  public InventorySettingsView updateSettings(AuthPrincipal principal, Integer expiryWarnDays) {
    Context ctx = requireReady(principal);
    if (expiryWarnDays == null || expiryWarnDays < 0) {
      throw validationError();
    }
    Location branch =
        locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(ctx.branchId(), ctx.tenantId())
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Branch was not found"));
    Map<String, Object> settings = new HashMap<>(branch.getInventorySettings());
    settings.put("expiryWarnDays", expiryWarnDays);
    branch.setInventorySettings(settings);
    branch.setUpdatedAt(clock.instant());
    locationRepository.saveAndFlush(branch);
    return new InventorySettingsView(expiryWarnDays);
  }

  @Transactional(readOnly = true)
  public BranchStockLevelView getStockLevels(AuthPrincipal principal, UUID productId) {
    Context ctx = requireReady(principal);
    Product product = requireProduct(productId, ctx.tenantId());
    return effectiveLevels(ctx, product);
  }

  @Transactional
  public BranchStockLevelView upsertStockLevels(
      AuthPrincipal principal,
      UUID productId,
      Integer reorderLevel,
      Integer reorderQuantity,
      Integer minimumStock) {
    Context ctx = requireReady(principal);
    Product product = requireProduct(productId, ctx.tenantId());
    if ((reorderLevel != null && reorderLevel < 0)
        || (reorderQuantity != null && reorderQuantity < 0)
        || (minimumStock != null && minimumStock < 0)) {
      throw validationError();
    }
    Instant now = clock.instant();
    BranchProductStockLevel row =
        branchProductStockLevelRepository
            .findByTenantIdAndBranchIdAndProductId(ctx.tenantId(), ctx.branchId(), product.getId())
            .orElseGet(
                () -> {
                  BranchProductStockLevel created = new BranchProductStockLevel();
                  created.setId(UUID.randomUUID());
                  created.setTenantId(ctx.tenantId());
                  created.setBranchId(ctx.branchId());
                  created.setProductId(product.getId());
                  created.setCreatedAt(now);
                  return created;
                });
    row.setReorderLevel(reorderLevel);
    row.setReorderQuantity(reorderQuantity);
    row.setMinimumStock(minimumStock);
    row.setUpdatedAt(now);
    branchProductStockLevelRepository.saveAndFlush(row);
    return new BranchStockLevelView(reorderLevel, reorderQuantity, minimumStock);
  }

  @Transactional(readOnly = true)
  public String reorderReportCsv(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    StringJoiner joiner = new StringJoiner("\n");
    joiner.add("sku,name,onHand,reorderLevel,minimumStock,reorderQuantity,suggestedOrderQty");
    for (InventoryReorderLine line : buildReorderLines(ctx)) {
      joiner.add(
          csv(line.sku())
              + ","
              + csv(line.name())
              + ","
              + line.onHand().toPlainString()
              + ","
              + nullToEmpty(line.reorderLevel())
              + ","
              + nullToEmpty(line.minimumStock())
              + ","
              + nullToEmpty(line.reorderQuantity())
              + ","
              + line.suggestedOrderQty());
    }
    return joiner.toString() + "\n";
  }

  @Transactional(readOnly = true)
  public StockValuationView valuation(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    List<StockBalance> balances =
        stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
            ctx.tenantId(), ctx.branchId());
    Map<UUID, StockBatch> batches = loadBatches(ctx.tenantId(), balances);
    long total = 0L;
    for (StockBalance balance : balances) {
      if (balance.getBatchId() == null) {
        continue;
      }
      StockBatch batch = batches.get(balance.getBatchId());
      if (batch == null) {
        continue;
      }
      total +=
          balance
              .getQuantity()
              .multiply(BigDecimal.valueOf(batch.getPurchasePricePaise()))
              .setScale(0, RoundingMode.HALF_UP)
              .longValueExact();
    }
    return new StockValuationView(total);
  }

  @Transactional(readOnly = true)
  public InventoryAlertsView alerts(AuthPrincipal principal) {
    Context ctx = requireReady(principal);
    int warnDays = expiryWarnDays(ctx);
    LocalDate today = today();
    List<InventoryAlertsView.LowStockAlertView> low = new ArrayList<>();
    for (InventoryReorderLine line : buildReorderLines(ctx)) {
      List<InventoryAlertsView.OtherBranchStockView> others = new ArrayList<>();
      for (Location branch :
          locationRepository.findAllByTenantIdAndDeletedAtIsNullOrderByBranchCodeAsc(
              ctx.tenantId())) {
        if (branch.getId().equals(ctx.branchId())) {
          continue;
        }
        BigDecimal qty =
            stockBalanceRepository
                .findAllByTenantIdAndBranchIdAndProductId(
                    ctx.tenantId(), branch.getId(), line.productId())
                .stream()
                .map(StockBalance::getQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (qty.compareTo(BigDecimal.ZERO) > 0) {
          others.add(
              new InventoryAlertsView.OtherBranchStockView(branch.getId(), branch.getName(), qty));
        }
      }
      low.add(
          new InventoryAlertsView.LowStockAlertView(
              line.productId(),
              line.sku(),
              line.name(),
              line.onHand(),
              line.reorderLevel(),
              line.minimumStock(),
              others));
    }

    List<InventoryAlertsView.NearExpiryAlertView> near = new ArrayList<>();
    List<StockBalance> balances =
        stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
            ctx.tenantId(), ctx.branchId());
    Map<UUID, Product> products = loadProducts(ctx.tenantId(), balances);
    Map<UUID, StockBatch> batches = loadBatches(ctx.tenantId(), balances);
    for (StockBalance balance : balances) {
      if (balance.getBatchId() == null || balance.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
        continue;
      }
      StockBatch batch = batches.get(balance.getBatchId());
      Product product = products.get(balance.getProductId());
      if (batch == null || product == null) {
        continue;
      }
      if (isExpired(batch.getExpiresOn(), today)
          || !isNearExpiry(batch.getExpiresOn(), today, warnDays)) {
        continue;
      }
      near.add(
          new InventoryAlertsView.NearExpiryAlertView(
              product.getId(),
              product.getSku(),
              product.getName(),
              batch.getId(),
              batch.getBatchNumber(),
              batch.getExpiresOn(),
              balance.getQuantity()));
    }
    return new InventoryAlertsView(low, near);
  }

  @Transactional(readOnly = true)
  public List<InventoryReorderLine> listReorderLinesForBranch(UUID tenantId, UUID branchId) {
    return buildReorderLines(new Context(tenantId, branchId, tenantId));
  }

  private List<InventoryReorderLine> buildReorderLines(Context ctx) {
    Map<UUID, BranchProductStockLevel> overrides = new HashMap<>();
    for (BranchProductStockLevel level :
        branchProductStockLevelRepository.findAllByTenantIdAndBranchId(
            ctx.tenantId(), ctx.branchId())) {
      overrides.put(level.getProductId(), level);
    }
    List<StockBalance> balances =
        stockBalanceRepository.findAllByTenantIdAndBranchIdOrderByProductIdAsc(
            ctx.tenantId(), ctx.branchId());
    Map<UUID, BigDecimal> onHandByProduct = new HashMap<>();
    for (StockBalance balance : balances) {
      onHandByProduct.merge(balance.getProductId(), balance.getQuantity(), BigDecimal::add);
    }
    List<InventoryReorderLine> lines = new ArrayList<>();
    for (Product product : productRepository.findAllByTenantIdOrderByNameAsc(ctx.tenantId())) {
      BranchStockLevelView levels = effectiveLevels(product, overrides.get(product.getId()));
      BigDecimal onHand = onHandByProduct.getOrDefault(product.getId(), BigDecimal.ZERO);
      if (!isLowStock(onHand, levels)) {
        continue;
      }
      int suggested = suggestedOrderQty(onHand, levels);
      lines.add(
          new InventoryReorderLine(
              product.getId(),
              product.getSku(),
              product.getName(),
              onHand,
              levels.reorderLevel(),
              levels.minimumStock(),
              levels.reorderQuantity(),
              suggested));
    }
    return lines;
  }

  private void maybeNotifyLowStock(Context ctx, Product product) {
    BranchStockLevelView levels = effectiveLevels(ctx, product);
    BigDecimal onHand =
        stockBalanceRepository
            .findAllByTenantIdAndBranchIdAndProductId(
                ctx.tenantId(), ctx.branchId(), product.getId())
            .stream()
            .map(StockBalance::getQuantity)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    if (!isLowStock(onHand, levels)) {
      return;
    }
    notificationRoutingService.route(
        new RouteCommand(
            "low-stock:" + ctx.tenantId() + ":" + ctx.branchId() + ":" + product.getId(),
            NotificationTrigger.LOW_STOCK,
            ctx.tenantId(),
            ctx.branchId(),
            product.getId(),
            null,
            null,
            null));
  }

  private BranchStockLevelView effectiveLevels(Context ctx, Product product) {
    return effectiveLevels(
        product,
        branchProductStockLevelRepository
            .findByTenantIdAndBranchIdAndProductId(ctx.tenantId(), ctx.branchId(), product.getId())
            .orElse(null));
  }

  private static BranchStockLevelView effectiveLevels(
      Product product, BranchProductStockLevel override) {
    if (override != null) {
      return new BranchStockLevelView(
          override.getReorderLevel(), override.getReorderQuantity(), override.getMinimumStock());
    }
    return new BranchStockLevelView(
        product.getReorderLevel(), product.getReorderQuantity(), product.getMinimumStock());
  }

  private static boolean isLowStock(BigDecimal onHand, BranchStockLevelView levels) {
    if (levels.reorderLevel() != null
        && onHand.compareTo(BigDecimal.valueOf(levels.reorderLevel())) <= 0) {
      return true;
    }
    return levels.minimumStock() != null
        && onHand.compareTo(BigDecimal.valueOf(levels.minimumStock())) <= 0;
  }

  private static int suggestedOrderQty(BigDecimal onHand, BranchStockLevelView levels) {
    if (levels.reorderQuantity() != null && levels.reorderQuantity() > 0) {
      return levels.reorderQuantity();
    }
    if (levels.reorderLevel() == null) {
      return 0;
    }
    int gap = levels.reorderLevel() - onHand.setScale(0, RoundingMode.UP).intValue();
    return Math.max(gap, 0);
  }

  private int expiryWarnDays(Context ctx) {
    return expiryWarnDaysForBranch(ctx.tenantId(), ctx.branchId());
  }

  private int expiryWarnDaysForBranch(UUID tenantId, UUID branchId) {
    return locationRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId)
        .map(InventoryStockService::readExpiryWarnDays)
        .orElse(30);
  }

  private static int readExpiryWarnDays(Location branch) {
    Object value =
        branch.getInventorySettings() == null
            ? null
            : branch.getInventorySettings().get("expiryWarnDays");
    if (value instanceof Number number) {
      return Math.max(number.intValue(), 0);
    }
    return 30;
  }

  private LocalDate today() {
    return LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
  }

  private static boolean isExpired(LocalDate expiresOn, LocalDate today) {
    return expiresOn != null && expiresOn.isBefore(today);
  }

  private static boolean isNearExpiry(LocalDate expiresOn, LocalDate today, int warnDays) {
    if (expiresOn == null || isExpired(expiresOn, today)) {
      return false;
    }
    return !expiresOn.isAfter(today.plusDays(warnDays));
  }

  private static String csv(String value) {
    String raw = value == null ? "" : value.replace("\"", "\"\"");
    if (raw.contains(",") || raw.contains("\"") || raw.contains("\n")) {
      return "\"" + raw + "\"";
    }
    return raw;
  }

  private static String nullToEmpty(Integer value) {
    return value == null ? "" : value.toString();
  }

  private Context requireReady(AuthPrincipal principal) {
    UUID tenantId = requireModuleAccess(principal, Set.of(ModuleCode.INVENTORY));
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId, principal.userId());
  }

  private Context requireReadyForReturn(AuthPrincipal principal) {
    UUID tenantId =
        requireModuleAccess(
            principal, Set.of(ModuleCode.INVENTORY, ModuleCode.PROCUREMENT, ModuleCode.FINANCE));
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId, principal.userId());
  }

  private Context requireReadyForSale(AuthPrincipal principal) {
    UUID tenantId = requireModuleAccess(principal, Set.of(ModuleCode.SALES, ModuleCode.INVENTORY));
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId, principal.userId());
  }

  private Context requireReadyForBatches(AuthPrincipal principal) {
    UUID tenantId = requireModuleAccess(principal, Set.of(ModuleCode.INVENTORY, ModuleCode.SALES));
    UUID branchId = principal.activeBranchId();
    if (branchId == null) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, NO_BRANCH_CODE, NO_BRANCH_MESSAGE);
    }
    return new Context(tenantId, branchId, principal.userId());
  }

  private UUID requireModuleAccess(AuthPrincipal principal, Set<ModuleCode> allowed) {
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
            .orElseThrow(InventoryStockService::forbidden);
    if (allowed.stream().noneMatch(accessQueryService.effectiveModules(user)::contains)) {
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

  private static String requireBatchNumber(String batchNumber) {
    String normalized = normalizeBatchNumber(batchNumber);
    if (normalized == null || normalized.isBlank() || normalized.length() > 64) {
      throw validationError();
    }
    return normalized;
  }

  private static String normalizeBatchNumber(String batchNumber) {
    return batchNumber == null ? null : batchNumber.trim();
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

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
  }

  private record Context(UUID tenantId, UUID branchId, UUID userId) {}
}
