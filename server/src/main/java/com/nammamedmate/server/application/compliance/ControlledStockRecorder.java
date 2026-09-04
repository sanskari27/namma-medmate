package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.domain.ControlledStockPolicy;
import com.nammamedmate.server.domain.ControlledStockRegister;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovement;
import com.nammamedmate.server.persistence.ControlledStockRegisterRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ControlledStockRecorder {

  private final ProductRepository productRepository;
  private final StockBatchRepository stockBatchRepository;
  private final ControlledStockRegisterRepository controlledStockRegisterRepository;

  public ControlledStockRecorder(
      ProductRepository productRepository,
      StockBatchRepository stockBatchRepository,
      ControlledStockRegisterRepository controlledStockRegisterRepository) {
    this.productRepository = productRepository;
    this.stockBatchRepository = stockBatchRepository;
    this.controlledStockRegisterRepository = controlledStockRegisterRepository;
  }

  public void record(StockMovement movement) {
    if (movement == null || movement.getId() == null) {
      return;
    }
    if (controlledStockRegisterRepository
        .findByTenantIdAndStockMovementId(movement.getTenantId(), movement.getId())
        .isPresent()) {
      return;
    }
    Product product =
        productRepository
            .findByIdAndTenantId(movement.getProductId(), movement.getTenantId())
            .orElse(null);
    if (!ControlledStockPolicy.isControlled(product)) {
      return;
    }
    StockBatch batch =
        movement.getBatchId() == null
            ? null
            : stockBatchRepository
                .findByIdAndTenantId(movement.getBatchId(), movement.getTenantId())
                .orElse(null);
    Instant now = movement.getCreatedAt() == null ? Instant.now() : movement.getCreatedAt();
    ControlledStockRegister row = new ControlledStockRegister();
    row.setId(UUID.randomUUID());
    row.setTenantId(movement.getTenantId());
    row.setBranchId(movement.getBranchId());
    row.setStockMovementId(movement.getId());
    row.setProductId(product.getId());
    row.setProductName(product.getName());
    row.setSku(product.getSku());
    row.setScheduleClassification(product.getScheduleClassification());
    row.setBatchId(movement.getBatchId());
    row.setBatchNumber(batch == null ? null : batch.getBatchNumber());
    row.setExpiresOn(batch == null ? null : batch.getExpiresOn());
    row.setQuantity(movement.getQuantity());
    row.setBalanceAfter(movement.getBalanceAfter());
    row.setMovementType(movement.getType());
    row.setCreatedByUserId(movement.getCreatedByUserId());
    row.setOccurredAt(movement.getOccurredAt());
    row.setCreatedAt(now);
    controlledStockRegisterRepository.saveAndFlush(row);
  }
}
