package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockTakeLine;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockTakeLineRepository extends JpaRepository<StockTakeLine, UUID> {

  List<StockTakeLine> findAllByTenantIdAndStockTakeIdOrderByCreatedAtAsc(
      UUID tenantId, UUID stockTakeId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select l from StockTakeLine l
      where l.id = :id and l.tenantId = :tenantId and l.stockTakeId = :stockTakeId
      """)
  Optional<StockTakeLine> lockByIdAndTenantIdAndStockTakeId(
      @Param("id") UUID id,
      @Param("tenantId") UUID tenantId,
      @Param("stockTakeId") UUID stockTakeId);
}
