package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Expense;
import com.nammamedmate.server.domain.ExpensePostingStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

  Optional<Expense> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<Expense> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  @Query(
      """
      select e from Expense e
      where e.tenantId = :tenantId
        and e.branchId in :branchIds
        and e.status = :status
        and (:categoryId is null or e.categoryId = :categoryId)
        and (:fromDate is null or e.occurredOn >= :fromDate)
        and (:toDate is null or e.occurredOn <= :toDate)
      order by e.occurredOn desc, e.createdAt desc
      """)
  List<Expense> findScoped(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("categoryId") UUID categoryId,
      @Param("fromDate") LocalDate fromDate,
      @Param("toDate") LocalDate toDate,
      @Param("status") ExpensePostingStatus status);

  @Query(
      """
      select e from Expense e
      where e.tenantId = :tenantId
        and e.branchId in :branchIds
        and e.status = :status
        and e.occurredOn >= :fromDate
        and e.occurredOn <= :toDate
      order by e.occurredOn desc, e.createdAt desc
      """)
  List<Expense> findPostedInWindow(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("status") ExpensePostingStatus status,
      @Param("fromDate") LocalDate fromDate,
      @Param("toDate") LocalDate toDate);
}
