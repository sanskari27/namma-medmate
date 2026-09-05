package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesPrescriptionFulfillment;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesPrescriptionFulfillmentRepository
    extends JpaRepository<SalesPrescriptionFulfillment, UUID> {

  Optional<SalesPrescriptionFulfillment> findByTenantIdAndPrescriptionReferenceAndProductId(
      UUID tenantId, String prescriptionReference, UUID productId);

  List<SalesPrescriptionFulfillment> findAllByTenantIdAndPrescriptionReference(
      UUID tenantId, String prescriptionReference);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select f from SalesPrescriptionFulfillment f
      where f.tenantId = :tenantId
        and f.prescriptionReference = :prescriptionReference
        and f.productId = :productId
      """)
  Optional<SalesPrescriptionFulfillment> lockByTenantIdAndPrescriptionReferenceAndProductId(
      @Param("tenantId") UUID tenantId,
      @Param("prescriptionReference") String prescriptionReference,
      @Param("productId") UUID productId);
}
