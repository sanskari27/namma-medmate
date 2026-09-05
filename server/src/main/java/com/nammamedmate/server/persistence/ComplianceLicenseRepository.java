package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ComplianceDocType;
import com.nammamedmate.server.domain.ComplianceLicense;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ComplianceLicenseRepository extends JpaRepository<ComplianceLicense, UUID> {

  Optional<ComplianceLicense> findByIdAndTenantId(UUID id, UUID tenantId);

  List<ComplianceLicense> findAllByTenantIdOrderByExpiresOnAsc(UUID tenantId);

  List<ComplianceLicense> findByTenantIdAndExpiresOnLessThanEqualOrderByExpiresOnAsc(
      UUID tenantId, LocalDate cutoff);

  @Query(
      """
      select l from ComplianceLicense l
      where l.tenantId = :tenantId
        and l.docType = :docType
        and ((:branchId is null and l.branchId is null) or l.branchId = :branchId)
        and ((:staffUserId is null and l.staffUserId is null) or l.staffUserId = :staffUserId)
      """)
  Optional<ComplianceLicense> findCurrent(
      @Param("tenantId") UUID tenantId,
      @Param("docType") ComplianceDocType docType,
      @Param("branchId") UUID branchId,
      @Param("staffUserId") UUID staffUserId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select l from ComplianceLicense l where l.id = :id and l.tenantId = :tenantId")
  Optional<ComplianceLicense> lockByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);
}
