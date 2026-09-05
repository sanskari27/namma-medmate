package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SupplierPayableAccount;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierPayableAccountRepository
    extends JpaRepository<SupplierPayableAccount, UUID> {

  Optional<SupplierPayableAccount> findByTenantIdAndBranchIdAndSupplierId(
      UUID tenantId, UUID branchId, UUID supplierId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select a from SupplierPayableAccount a
      where a.tenantId = :tenantId and a.branchId = :branchId and a.supplierId = :supplierId
      """)
  Optional<SupplierPayableAccount> lockByTenantIdAndBranchIdAndSupplierId(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("supplierId") UUID supplierId);

  List<SupplierPayableAccount>
      findAllByTenantIdAndBranchIdAndBalancePaiseGreaterThanOrderByBalancePaiseDesc(
          UUID tenantId, UUID branchId, long balancePaise);
}
