package com.nammamedmate.server.feature.audit;

import com.nammamedmate.server.application.audit.AuditEventView;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

  private final AuditService auditService;

  public AuditController(AuditService auditService) {
    this.auditService = auditService;
  }

  @GetMapping
  public ApiResponse<AuditListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(new AuditListResponse(auditService.list(principal)));
  }

  @GetMapping("/export")
  public ApiResponse<AuditListResponse> export(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(new AuditListResponse(auditService.export(principal)));
  }

  public record AuditListResponse(List<AuditEventView> events) {}
}
