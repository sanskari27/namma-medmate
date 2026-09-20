package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalWardStock;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalWardStockRepository extends JpaRepository<HospitalWardStock, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select s from HospitalWardStock s
      where s.tenantId = :tenantId
        and s.branchId = :branchId
        and s.wardId = :wardId
        and s.productId = :productId
      """)
  Optional<HospitalWardStock> lockByTenantIdAndBranchIdAndWardIdAndProductId(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("wardId") UUID wardId,
      @Param("productId") UUID productId);
}
