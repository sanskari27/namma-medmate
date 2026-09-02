package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ApprovalDecision;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalDecisionRepository extends JpaRepository<ApprovalDecision, UUID> {

  Optional<ApprovalDecision> findByRequestId(UUID requestId);
}
