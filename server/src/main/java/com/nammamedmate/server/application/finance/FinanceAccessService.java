package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceAccessService {

  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;

  public FinanceAccessService(
      AppUserRepository appUserRepository, AccessQueryService accessQueryService) {
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
  }

  @Transactional(readOnly = true)
  public Context requireFinance(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw FinanceAccessPolicy.forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw FinanceAccessPolicy.forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(FinanceAccessPolicy::forbidden);
    boolean accountant =
        accessQueryService.hasAssignedRoleCode(user, FinanceAccessPolicy.ACCOUNTANT_CODE);
    boolean finance = accessQueryService.effectiveModules(user).contains(ModuleCode.FINANCE);
    FinanceAccessPolicy.requireAllowed(principal.role(), accountant, finance);
    return new Context(principal.tenantId(), principal.activeBranchId());
  }

  public record Context(UUID tenantId, UUID sessionBranchId) {}
}
