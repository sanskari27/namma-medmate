package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ExpenseEvidence;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseEvidenceRepository extends JpaRepository<ExpenseEvidence, UUID> {

  Optional<ExpenseEvidence> findByIdAndTenantIdAndExpenseId(
      UUID id, UUID tenantId, UUID expenseId);

  List<ExpenseEvidence> findAllByTenantIdAndExpenseIdOrderByUploadedAtAsc(
      UUID tenantId, UUID expenseId);
}
