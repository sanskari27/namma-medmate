package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ApprovalRequest;
import com.nammamedmate.server.domain.ApprovalRequestStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, UUID> {

  Optional<ApprovalRequest> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  Optional<ApprovalRequest> findByIdAndTenantId(UUID id, UUID tenantId);

  List<ApprovalRequest> findByTenantIdAndStatusOrderByCreatedAtAsc(
      UUID tenantId, ApprovalRequestStatus status);

  List<ApprovalRequest> findByStatusOrderByCreatedAtAsc(ApprovalRequestStatus status);
}
