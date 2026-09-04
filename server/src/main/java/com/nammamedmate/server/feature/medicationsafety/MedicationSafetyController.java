package com.nammamedmate.server.feature.medicationsafety;

import com.nammamedmate.server.application.medicationsafety.MedicationSafetyAcknowledgeCommand;
import com.nammamedmate.server.application.medicationsafety.MedicationSafetyAcknowledgeView;
import com.nammamedmate.server.application.medicationsafety.MedicationSafetyClearedView;
import com.nammamedmate.server.application.medicationsafety.MedicationSafetyEvaluateCommand;
import com.nammamedmate.server.application.medicationsafety.MedicationSafetyEvaluationView;
import com.nammamedmate.server.application.medicationsafety.MedicationSafetyService;
import com.nammamedmate.server.application.medicationsafety.MedicationSafetyWarningView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/medication-safety")
public class MedicationSafetyController {

  private final MedicationSafetyService medicationSafetyService;

  public MedicationSafetyController(MedicationSafetyService medicationSafetyService) {
    this.medicationSafetyService = medicationSafetyService;
  }

  @PostMapping("/evaluate")
  public ApiResponse<EvaluationResponse> evaluate(
      Authentication authentication, @RequestBody EvaluateRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    MedicationSafetyEvaluationView view =
        medicationSafetyService.evaluate(
            principal,
            new MedicationSafetyEvaluateCommand(
                request == null ? null : request.customerId(),
                request == null ? List.of() : request.productIds()));
    return ApiResponse.ok(toEvaluationResponse(view));
  }

  @PostMapping("/acknowledge")
  public ApiResponse<AcknowledgeResponse> acknowledge(
      Authentication authentication, @RequestBody AcknowledgeRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    MedicationSafetyAcknowledgeView view =
        medicationSafetyService.acknowledge(principal, toAckCommand(request));
    return ApiResponse.ok(new AcknowledgeResponse(view.acknowledged(), view.acknowledgedAt()));
  }

  @PostMapping("/assert-cleared")
  public ApiResponse<ClearedResponse> assertCleared(
      Authentication authentication, @RequestBody AcknowledgeRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    MedicationSafetyClearedView view =
        medicationSafetyService.assertCleared(principal, toAckCommand(request));
    return ApiResponse.ok(new ClearedResponse(view.cleared()));
  }

  private static MedicationSafetyAcknowledgeCommand toAckCommand(AcknowledgeRequest request) {
    if (request == null) {
      return new MedicationSafetyAcknowledgeCommand(null, List.of(), List.of(), null);
    }
    return new MedicationSafetyAcknowledgeCommand(
        request.customerId(),
        request.productIds() == null ? List.of() : request.productIds(),
        request.warningKeys() == null ? List.of() : request.warningKeys(),
        request.reason());
  }

  private static EvaluationResponse toEvaluationResponse(MedicationSafetyEvaluationView view) {
    return new EvaluationResponse(
        view.checkStatus(),
        view.checkLabel(),
        view.productsChecked(),
        view.warnings().stream().map(MedicationSafetyController::toWarning).toList());
  }

  private static WarningResponse toWarning(MedicationSafetyWarningView warning) {
    return new WarningResponse(
        warning.warningKey(),
        warning.kind(),
        warning.customerId(),
        warning.productId(),
        warning.productIds(),
        warning.matchedAllergen(),
        warning.matchedComposition(),
        warning.matchedField(),
        warning.severity(),
        warning.requiredAction(),
        warning.requiredReview());
  }

  public record EvaluateRequest(UUID customerId, List<UUID> productIds) {}

  public record AcknowledgeRequest(
      UUID customerId, List<UUID> productIds, List<String> warningKeys, String reason) {}

  public record EvaluationResponse(
      String checkStatus, String checkLabel, int productsChecked, List<WarningResponse> warnings) {}

  public record WarningResponse(
      String warningKey,
      String kind,
      UUID customerId,
      UUID productId,
      List<UUID> productIds,
      String matchedAllergen,
      String matchedComposition,
      String matchedField,
      String severity,
      String requiredAction,
      boolean requiredReview) {}

  public record AcknowledgeResponse(boolean acknowledged, Instant acknowledgedAt) {}

  public record ClearedResponse(boolean cleared) {}
}
