package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ExpenseCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, UUID> {

  Optional<ExpenseCategory> findByTenantIdIsNullAndCode(String code);

  Optional<ExpenseCategory> findByTenantIdAndCode(UUID tenantId, String code);

  @Query(
      """
      select c from ExpenseCategory c
      where c.tenantId is null or c.tenantId = :tenantId
      order by c.system desc, c.label asc
      """)
  List<ExpenseCategory> findAvailableForTenant(@Param("tenantId") UUID tenantId);
}
