package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockBatch;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockBatchRepository extends JpaRepository<StockBatch, UUID> {

  Optional<StockBatch> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<StockBatch> findByTenantIdAndProductIdAndBatchNumber(
      UUID tenantId, UUID productId, String batchNumber);

  List<StockBatch> findAllByTenantIdAndProductIdOrderByExpiresOnAscBatchNumberAsc(
      UUID tenantId, UUID productId);
}
