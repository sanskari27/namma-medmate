package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.KycDocument;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KycDocumentRepository extends JpaRepository<KycDocument, UUID> {

  List<KycDocument> findBySubmissionIdAndTenantIdOrderByDocTypeAsc(
      UUID submissionId, UUID tenantId);

  Optional<KycDocument> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<KycDocument> findByIdAndSubmissionIdAndTenantId(
      UUID id, UUID submissionId, UUID tenantId);
}
