package com.nammamedmate.server.feature.approval;

import com.nammamedmate.server.application.approval.ApprovalActionCatalog;
import com.nammamedmate.server.application.approval.ApprovalRequestView;
import com.nammamedmate.server.application.approval.ApprovalRuleView;
import com.nammamedmate.server.application.approval.ApprovalService;
import com.nammamedmate.server.application.approval.CreateApprovalRequestCommand;
import com.nammamedmate.server.application.approval.CreateApprovalRuleCommand;
import com.nammamedmate.server.application.approval.DecideApprovalCommand;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.domain.ApproverType;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/approvals")
public class ApprovalController {

  private final ApprovalService approvalService;

  public ApprovalController(ApprovalService approvalService) {
    this.approvalService = approvalService;
  }

  @GetMapping("/actions")
  public ApiResponse<ApprovalActionListResponse> actions() {
    return ApiResponse.ok(new ApprovalActionListResponse(approvalService.actions()));
  }

  @GetMapping("/rules")
  public ApiResponse<ApprovalRuleListResponse> listRules(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(new ApprovalRuleListResponse(approvalService.listRules(principal)));
  }

  @PostMapping("/rules")
  public ApiResponse<ApprovalRuleView> createRule(
      @Valid @RequestBody CreateApprovalRuleRequest request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        approvalService.createRule(
            principal,
            new CreateApprovalRuleCommand(
                ModuleCode.valueOf(request.moduleCode()),
                ApprovalActionKey.valueOf(request.actionKey()),
                request.thresholdValue(),
                ApproverType.valueOf(request.approverType()),
                request.approverAccountClass() == null
                    ? null
                    : AppUserRole.valueOf(request.approverAccountClass()),
                request.approverRoleId(),
                Boolean.TRUE.equals(request.allowSelfApproval()))));
  }

  @PatchMapping("/rules/{id}")
  public ApiResponse<ApprovalRuleView> patchRule(
      @PathVariable UUID id,
      @Valid @RequestBody PatchApprovalRuleRequest request,
      Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        approvalService.patchRule(
            principal,
            id,
            request.thresholdValue(),
            request.approverType() == null ? null : ApproverType.valueOf(request.approverType()),
            request.approverAccountClass() == null
                ? null
                : AppUserRole.valueOf(request.approverAccountClass()),
            request.approverRoleId(),
            request.allowSelfApproval(),
            request.version()));
  }

  @PostMapping("/rules/{id}/deactivate")
  public ApiResponse<ApprovalRuleView> deactivateRule(
      @PathVariable UUID id, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(approvalService.deactivateRule(principal, id));
  }

  @GetMapping("/pending")
  public ApiResponse<ApprovalRequestListResponse> pending(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(new ApprovalRequestListResponse(approvalService.pending(principal)));
  }

  @PostMapping("/requests")
  public ApiResponse<ApprovalRequestView> createRequest(
      @Valid @RequestBody CreateApprovalRequestBody request, Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        approvalService.createRequest(
            principal,
            new CreateApprovalRequestCommand(
                ModuleCode.valueOf(request.moduleCode()),
                ApprovalActionKey.valueOf(request.actionKey()),
                request.branchId(),
                request.amountValue(),
                request.contextJson(),
                request.idempotencyKey())));
  }

  @PostMapping("/requests/{id}/decide")
  public ApiResponse<ApprovalRequestView> decide(
      @PathVariable UUID id,
      @Valid @RequestBody DecideApprovalRequest request,
      Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        approvalService.decide(
            principal,
            id,
            new DecideApprovalCommand(
                ApprovalDecisionOutcome.valueOf(request.outcome()),
                request.note(),
                request.version())));
  }

  public record ApprovalActionListResponse(
      List<ApprovalActionCatalog.ApprovalActionCatalogItem> actions) {}

  public record ApprovalRuleListResponse(List<ApprovalRuleView> rules) {}

  public record ApprovalRequestListResponse(List<ApprovalRequestView> requests) {}

  public record CreateApprovalRuleRequest(
      @NotBlank String moduleCode,
      @NotBlank String actionKey,
      Integer thresholdValue,
      @NotBlank String approverType,
      String approverAccountClass,
      UUID approverRoleId,
      Boolean allowSelfApproval) {}

  public record PatchApprovalRuleRequest(
      Integer thresholdValue,
      String approverType,
      String approverAccountClass,
      UUID approverRoleId,
      Boolean allowSelfApproval,
      @NotNull Integer version) {}

  public record CreateApprovalRequestBody(
      @NotBlank String moduleCode,
      @NotBlank String actionKey,
      UUID branchId,
      Integer amountValue,
      String contextJson,
      String idempotencyKey) {}

  public record DecideApprovalRequest(
      @NotBlank String outcome, String note, @NotNull Integer version) {}
}
