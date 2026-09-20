package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalIndent;
import com.nammamedmate.server.domain.HospitalIndentStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalIndentRepository extends JpaRepository<HospitalIndent, UUID> {

  List<HospitalIndent> findAllByTenantIdAndBranchIdOrderByRequestedAtDesc(
      UUID tenantId, UUID branchId);

  List<HospitalIndent> findAllByTenantIdAndBranchIdAndStatusOrderByRequestedAtDesc(
      UUID tenantId, UUID branchId, HospitalIndentStatus status);

  Optional<HospitalIndent> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  long countByTenantIdAndBranchIdAndStatus(
      UUID tenantId, UUID branchId, HospitalIndentStatus status);

  long countByTenantIdAndBranchId(UUID tenantId, UUID branchId);

  @Query(
      """
      select count(i) from HospitalIndent i
      where i.tenantId = :tenantId
        and i.branchId = :branchId
        and i.status = com.nammamedmate.server.domain.HospitalIndentStatus.ISSUED
        and i.issuedAt >= :start
        and i.issuedAt < :end
      """)
  long countIssuedToday(
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("start") Instant start,
      @Param("end") Instant end);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select i from HospitalIndent i
      where i.id = :id
        and i.tenantId = :tenantId
        and i.branchId = :branchId
      """)
  Optional<HospitalIndent> lockByIdAndTenantIdAndBranchId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId, @Param("branchId") UUID branchId);
}
