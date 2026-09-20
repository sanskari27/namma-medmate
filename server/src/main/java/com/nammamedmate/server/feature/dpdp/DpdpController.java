package com.nammamedmate.server.feature.dpdp;

import com.nammamedmate.server.application.dpdp.DpdpRequestService;
import com.nammamedmate.server.application.dpdp.DpdpRequestView;
import com.nammamedmate.server.domain.DpdpCategory;
import com.nammamedmate.server.domain.DpdpPrincipalType;
import com.nammamedmate.server.domain.DpdpRequestType;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.exception.ApiException;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dpdp")
public class DpdpController {

  private final DpdpRequestService dpdpRequestService;

  public DpdpController(DpdpRequestService dpdpRequestService) {
    this.dpdpRequestService = dpdpRequestService;
  }

  @GetMapping("/matrix")
  public ApiResponse<MatrixResponse> matrix(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(new MatrixResponse(dpdpRequestService.matrix(principal, false)));
  }

  @GetMapping("/requests")
  public ApiResponse<ListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new ListResponse(
            dpdpRequestService.list(principal, false).stream()
                .map(DpdpController::toResponse)
                .toList()));
  }

  @PostMapping("/requests")
  public ApiResponse<RequestResponse> create(
      Authentication authentication, @Valid @RequestBody CreateRequest body) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            dpdpRequestService.create(
                principal,
                false,
                parseType(body.principalType()),
                parseRequest(body.requestType()),
                body.principalId(),
                body.submittedName(),
                body.submittedPhone(),
                body.notes())));
  }

  @GetMapping("/requests/{id}")
  public ApiResponse<RequestResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(dpdpRequestService.get(principal, false, id)));
  }

  @PostMapping("/requests/{id}/accept")
  public ApiResponse<RequestResponse> accept(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody AcceptRequest body) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(dpdpRequestService.accept(principal, false, id, body.identityMethod())));
  }

  @PostMapping("/requests/{id}/decide")
  public ApiResponse<RequestResponse> decide(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody DecideRequest body) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            dpdpRequestService.decide(
                principal, false, id, body.decision(), body.decisionReason(), body.correction())));
  }

  static RequestResponse toResponse(DpdpRequestView view) {
    return new RequestResponse(
        view.id(),
        view.tenantId(),
        view.principalType().name(),
        view.principalId(),
        view.requestType().name(),
        view.status().name(),
        view.submittedName(),
        view.submittedPhone(),
        view.notes(),
        view.identityMethod(),
        view.identityAttestedBy(),
        view.identityAttestedAt(),
        view.acceptedAt(),
        view.deadlineAt(),
        view.decision(),
        view.decisionReason(),
        view.legalRetention(),
        view.exportJson(),
        view.createdBy(),
        view.version(),
        view.createdAt());
  }

  static DpdpPrincipalType parseType(String value) {
    try {
      return DpdpPrincipalType.valueOf(value);
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Unknown principal type");
    }
  }

  static DpdpRequestType parseRequest(String value) {
    try {
      return DpdpRequestType.valueOf(value);
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Unknown request type");
    }
  }

  public record MatrixResponse(List<DpdpCategory> categories) {}

  public record ListResponse(List<RequestResponse> items) {}

  public record CreateRequest(
      @NotBlank String principalType,
      @NotBlank String requestType,
      UUID principalId,
      String submittedName,
      String submittedPhone,
      String notes) {}

  public record AcceptRequest(@NotBlank String identityMethod) {}

  public record DecideRequest(
      @NotBlank String decision, String decisionReason, Map<String, String> correction) {}

  public record RequestResponse(
      UUID id,
      UUID tenantId,
      String principalType,
      UUID principalId,
      String requestType,
      String status,
      String submittedName,
      String submittedPhone,
      String notes,
      String identityMethod,
      UUID identityAttestedBy,
      Instant identityAttestedAt,
      Instant acceptedAt,
      Instant deadlineAt,
      String decision,
      String decisionReason,
      boolean legalRetention,
      String exportJson,
      UUID createdBy,
      int version,
      Instant createdAt) {}
}
