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
        and (cast(:categoryId as uuid) is null or e.categoryId = :categoryId)
        and (cast(:fromDate as date) is null or e.occurredOn >= :fromDate)
        and (cast(:toDate as date) is null or e.occurredOn <= :toDate)
        and (
          cast(:q as string) = ''
          or lower(coalesce(e.partyName, '')) like lower(concat('%', cast(:q as string), '%'))
          or lower(e.expenseNo) like lower(concat('%', cast(:q as string), '%'))
          or lower(e.categoryLabel) like lower(concat('%', cast(:q as string), '%'))
          or lower(coalesce(e.notes, '')) like lower(concat('%', cast(:q as string), '%'))
        )
      order by e.occurredOn desc, e.createdAt desc
      """)
  List<Expense> findScoped(
      @Param("tenantId") UUID tenantId,
      @Param("branchIds") Collection<UUID> branchIds,
      @Param("categoryId") UUID categoryId,
      @Param("fromDate") LocalDate fromDate,
      @Param("toDate") LocalDate toDate,
      @Param("status") ExpensePostingStatus status,
      @Param("q") String q);

  @Query(
      value =
          """
          select coalesce(max(cast(substring(expense_no from 5) as bigint)), 1000)
          from expense
          where tenant_id = :tenantId
            and expense_no ~ '^EXP-[0-9]+$'
          """,
      nativeQuery = true)
  long maxExpenseSequence(@Param("tenantId") UUID tenantId);

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
