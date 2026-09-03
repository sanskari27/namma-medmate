package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.KioskSession;
import com.nammamedmate.server.domain.KioskSessionStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KioskSessionRepository extends JpaRepository<KioskSession, UUID> {

  Optional<KioskSession> findByTenantIdAndBranchIdAndStatus(
      UUID tenantId, UUID branchId, KioskSessionStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select s from KioskSession s where s.tenantId = :tenantId and s.branchId = :branchId and s.status = :status")
  Optional<KioskSession> lockOpen(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("status") KioskSessionStatus status);
}
