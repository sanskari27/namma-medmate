package com.nammamedmate.server.feature.dpdp;

import com.nammamedmate.server.application.dpdp.DpdpRequestService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dpdp")
public class AdminDpdpController {

  private final DpdpRequestService dpdpRequestService;

  public AdminDpdpController(DpdpRequestService dpdpRequestService) {
    this.dpdpRequestService = dpdpRequestService;
  }

  @GetMapping("/matrix")
  public ApiResponse<DpdpController.MatrixResponse> matrix(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new DpdpController.MatrixResponse(dpdpRequestService.matrix(principal, true)));
  }

  @GetMapping("/requests")
  public ApiResponse<DpdpController.ListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new DpdpController.ListResponse(
            dpdpRequestService.list(principal, true).stream()
                .map(DpdpController::toResponse)
                .toList()));
  }

  @PostMapping("/requests")
  public ApiResponse<DpdpController.RequestResponse> create(
      Authentication authentication, @Valid @RequestBody DpdpController.CreateRequest body) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        DpdpController.toResponse(
            dpdpRequestService.create(
                principal,
                true,
                DpdpController.parseType(body.principalType()),
                DpdpController.parseRequest(body.requestType()),
                body.principalId(),
                body.submittedName(),
                body.submittedPhone(),
                body.notes())));
  }

  @GetMapping("/requests/{id}")
  public ApiResponse<DpdpController.RequestResponse> get(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(DpdpController.toResponse(dpdpRequestService.get(principal, true, id)));
  }

  @PostMapping("/requests/{id}/accept")
  public ApiResponse<DpdpController.RequestResponse> accept(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody DpdpController.AcceptRequest body) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        DpdpController.toResponse(
            dpdpRequestService.accept(principal, true, id, body.identityMethod())));
  }

  @PostMapping("/requests/{id}/decide")
  public ApiResponse<DpdpController.RequestResponse> decide(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody DpdpController.DecideRequest body) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        DpdpController.toResponse(
            dpdpRequestService.decide(
                principal, true, id, body.decision(), body.decisionReason(), body.correction())));
  }
}
