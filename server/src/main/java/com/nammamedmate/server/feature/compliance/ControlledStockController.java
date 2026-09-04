package com.nammamedmate.server.feature.compliance;

import com.nammamedmate.server.application.compliance.ControlledStockLineView;
import com.nammamedmate.server.application.compliance.ControlledStockService;
import com.nammamedmate.server.application.compliance.ControlledStockVerifyCommand;
import com.nammamedmate.server.application.compliance.ControlledStockVerifyView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/compliance/controlled-stock")
public class ControlledStockController {

  private final ControlledStockService controlledStockService;

  public ControlledStockController(ControlledStockService controlledStockService) {
    this.controlledStockService = controlledStockService;
  }

  @PostMapping("/verify")
  public ApiResponse<VerifyResponse> verify(
      Authentication authentication, @RequestBody VerifyRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    ControlledStockVerifyView view =
        controlledStockService.verify(
            principal,
            new ControlledStockVerifyCommand(
                request == null ? null : request.customerId(),
                request == null ? null : request.doctorId(),
                request != null && Boolean.TRUE.equals(request.prescriptionVerified()),
                request == null ? null : request.prescriptionReference(),
                request == null || request.productIds() == null
                    ? List.of()
                    : request.productIds()));
    return ApiResponse.ok(
        new VerifyResponse(view.allowed(), view.controlledProductIds(), view.schedules()));
  }

  @GetMapping
  public ApiResponse<RegisterResponse> list(
      Authentication authentication,
      @RequestParam(required = false) UUID branchId,
      @RequestParam(required = false) String schedule,
      @RequestParam(required = false) UUID productId,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new RegisterResponse(
            controlledStockService
                .list(principal, branchId, schedule, productId, from, to)
                .items()
                .stream()
                .map(ControlledStockController::toLine)
                .toList()));
  }

  @GetMapping(value = "/export", produces = "text/csv")
  public ResponseEntity<String> export(
      Authentication authentication,
      @RequestParam(required = false) String format,
      @RequestParam(required = false) UUID branchId,
      @RequestParam(required = false) String schedule,
      @RequestParam(required = false) UUID productId,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    String csv =
        controlledStockService.exportCsv(
            principal, format, branchId, schedule, productId, from, to);
    String filename =
        "ndps".equalsIgnoreCase(format) ? "ndps-stock-register.csv" : "schedule-register.csv";
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(new MediaType("text", "csv"))
        .body(csv);
  }

  private static LineResponse toLine(ControlledStockLineView view) {
    return new LineResponse(
        view.id(),
        view.stockMovementId(),
        view.productId(),
        view.productName(),
        view.sku(),
        view.scheduleClassification() == null ? null : view.scheduleClassification().name(),
        view.batchId(),
        view.batchNumber(),
        view.expiresOn(),
        view.quantity(),
        view.balanceAfter(),
        view.movementType(),
        view.createdByUserId(),
        view.occurredAt());
  }

  public record VerifyRequest(
      UUID customerId,
      UUID doctorId,
      Boolean prescriptionVerified,
      String prescriptionReference,
      List<UUID> productIds) {}

  public record VerifyResponse(
      boolean allowed, List<UUID> controlledProductIds, Map<UUID, String> schedules) {}

  public record RegisterResponse(List<LineResponse> items) {}

  public record LineResponse(
      UUID id,
      UUID stockMovementId,
      UUID productId,
      String productName,
      String sku,
      String scheduleClassification,
      UUID batchId,
      String batchNumber,
      LocalDate expiresOn,
      BigDecimal quantity,
      BigDecimal balanceAfter,
      String movementType,
      UUID createdByUserId,
      Instant occurredAt) {}
}
