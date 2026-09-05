package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ComplianceLicenseEvidence;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplianceLicenseEvidenceRepository
    extends JpaRepository<ComplianceLicenseEvidence, UUID> {

  Optional<ComplianceLicenseEvidence> findByIdAndTenantIdAndLicenseId(
      UUID id, UUID tenantId, UUID licenseId);

  List<ComplianceLicenseEvidence> findAllByLicenseIdAndTenantIdOrderByUploadedAtAsc(
      UUID licenseId, UUID tenantId);
}
