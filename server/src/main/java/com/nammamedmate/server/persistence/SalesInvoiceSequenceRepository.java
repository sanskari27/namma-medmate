package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesInvoiceSequence;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesInvoiceSequenceRepository extends JpaRepository<SalesInvoiceSequence, UUID> {

  Optional<SalesInvoiceSequence> findByTenantIdAndBranchIdAndFinancialYear(
      UUID tenantId, UUID branchId, String financialYear);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select s from SalesInvoiceSequence s
      where s.tenantId = :tenantId
        and s.branchId = :branchId
        and s.financialYear = :financialYear
      """)
  Optional<SalesInvoiceSequence> lockByTenantIdAndBranchIdAndFinancialYear(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("financialYear") String financialYear);
}
