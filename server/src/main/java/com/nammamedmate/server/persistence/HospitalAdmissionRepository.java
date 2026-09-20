package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalAdmission;
import com.nammamedmate.server.domain.HospitalAdmissionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalAdmissionRepository extends JpaRepository<HospitalAdmission, UUID> {

  List<HospitalAdmission> findAllByTenantIdAndBranchIdAndStatusOrderByAdmittedAtDesc(
      UUID tenantId, UUID branchId, HospitalAdmissionStatus status);

  Optional<HospitalAdmission> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  Optional<HospitalAdmission> findByTenantIdAndBranchIdAndUhidIgnoreCase(
      UUID tenantId, UUID branchId, String uhid);

  Optional<HospitalAdmission> findByTenantIdAndUhidIgnoreCase(UUID tenantId, String uhid);

  boolean existsByTenantIdAndUhidIgnoreCase(UUID tenantId, String uhid);

  long countByTenantIdAndBranchIdAndStatus(
      UUID tenantId, UUID branchId, HospitalAdmissionStatus status);

  @Query(
      value =
          """
          SELECT COALESCE(MAX(CAST(SUBSTRING(uhid FROM '[0-9]+$') AS INTEGER)), 0)
          FROM hospital_admission
          WHERE tenant_id = :tenantId AND uhid ~ '^UHID-[0-9]+$'
          """,
      nativeQuery = true)
  int maxNumericUhidSuffix(@Param("tenantId") UUID tenantId);
}
