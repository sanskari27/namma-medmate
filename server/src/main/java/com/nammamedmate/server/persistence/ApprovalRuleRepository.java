package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AccessScope;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalRule;
import com.nammamedmate.server.domain.ModuleCode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalRuleRepository extends JpaRepository<ApprovalRule, UUID> {

  List<ApprovalRule> findByTenantIdAndDeletedAtIsNullOrderByModuleCodeAscActionKeyAsc(
      UUID tenantId);

  List<ApprovalRule> findByScopeAndDeletedAtIsNullOrderByModuleCodeAscActionKeyAsc(
      AccessScope scope);

  Optional<ApprovalRule> findByIdAndDeletedAtIsNull(UUID id);

  Optional<ApprovalRule> findByTenantIdAndModuleCodeAndActionKeyAndDeletedAtIsNull(
      UUID tenantId, ModuleCode moduleCode, ApprovalActionKey actionKey);

  Optional<ApprovalRule> findByScopeAndModuleCodeAndActionKeyAndDeletedAtIsNull(
      AccessScope scope, ModuleCode moduleCode, ApprovalActionKey actionKey);
}
