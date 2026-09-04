package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StockTransfer;
import com.nammamedmate.server.domain.StockTransferStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockTransferRepository extends JpaRepository<StockTransfer, UUID> {

  Optional<StockTransfer> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  Optional<StockTransfer> findByIdAndTenantId(UUID id, UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from StockTransfer t where t.id = :id and t.tenantId = :tenantId")
  Optional<StockTransfer> lockByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);

  @Query(
      """
      select t from StockTransfer t
      where t.tenantId = :tenantId
        and (t.fromBranchId = :branchId or t.toBranchId = :branchId)
      order by t.createdAt desc
      """)
  List<StockTransfer> findAllForBranch(
      @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);

  @Query(
      """
      select t from StockTransfer t
      where t.tenantId = :tenantId
        and t.fromBranchId = :branchId
        and t.status in :statuses
      order by t.createdAt desc
      """)
  List<StockTransfer> findOutgoingByStatuses(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("statuses") List<StockTransferStatus> statuses);

  @Query(
      """
      select t from StockTransfer t
      where t.tenantId = :tenantId
        and t.toBranchId = :branchId
        and t.status in :statuses
      order by t.createdAt desc
      """)
  List<StockTransfer> findIncomingByStatuses(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("statuses") List<StockTransferStatus> statuses);

  @Query(
      """
      select t from StockTransfer t
      where t.tenantId = :tenantId
        and (t.fromBranchId = :branchId or t.toBranchId = :branchId)
        and t.status in :statuses
      order by t.createdAt desc
      """)
  List<StockTransfer> findHistoryByStatuses(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("statuses") List<StockTransferStatus> statuses);
}
