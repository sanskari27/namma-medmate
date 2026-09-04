package com.nammamedmate.server.application.inventory;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.StockBalance;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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
  private final Clock clock;

  public InventoryStockService(
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      StockBalanceRepository stockBalanceRepository,
      StockMovementRepository stockMovementRepository,
      Clock clock) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.stockBalanceRepository = stockBalanceRepository;
    this.stockMovementRepository = stockMovementRepository;
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
    Context ctx = requireReady(principal);
    Product product = requireProduct(productId, ctx.tenantId());
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
                balance.getId()));
        continue;
      }
      StockBatch batch =
          stockBatchRepository
              .findByIdAndTenantId(balance.getBatchId(), ctx.tenantId())
              .orElse(null);
      if (batch == null) {
        continue;
      }
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
              balance.getId()));
    }
    items.sort(
        Comparator.comparing(
                (StockBatchDetailView v) -> v.expiresOn() == null ? LocalDate.MAX : v.expiresOn())
            .thenComparing(v -> v.batchNumber() == null ? "" : v.batchNumber()));
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
    Context ctx = requireReady(principal);
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
        balance.getVersion());
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
            .orElseThrow(InventoryStockService::forbidden);
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
