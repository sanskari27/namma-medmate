package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PrescriptionReference;
import com.nammamedmate.server.domain.PrescriptionReferenceStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrescriptionReferenceRepository
    extends JpaRepository<PrescriptionReference, UUID> {

  Optional<PrescriptionReference> findByTenantIdAndPrescriptionReference(
      UUID tenantId, String prescriptionReference);

  Optional<PrescriptionReference> findByIdAndTenantId(UUID id, UUID tenantId);

  List<PrescriptionReference> findByTenantIdOrderByIssuedAtDesc(UUID tenantId);

  List<PrescriptionReference> findByTenantIdAndStatusOrderByIssuedAtDesc(
      UUID tenantId, PrescriptionReferenceStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select r from PrescriptionReference r
      where r.tenantId = :tenantId
        and r.prescriptionReference = :prescriptionReference
      """)
  Optional<PrescriptionReference> lockByTenantIdAndPrescriptionReference(
      @Param("tenantId") UUID tenantId,
      @Param("prescriptionReference") String prescriptionReference);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select r from PrescriptionReference r
      where r.id = :id and r.tenantId = :tenantId
      """)
  Optional<PrescriptionReference> lockByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);
}
