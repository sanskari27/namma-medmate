package com.nammamedmate.server.feature.compliance;

import com.nammamedmate.server.application.compliance.ControlledSaleLineView;
import com.nammamedmate.server.application.compliance.ControlledSaleRegisterService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/compliance/controlled-register")
public class ControlledSaleRegisterController {

  private final ControlledSaleRegisterService controlledSaleRegisterService;

  public ControlledSaleRegisterController(
      ControlledSaleRegisterService controlledSaleRegisterService) {
    this.controlledSaleRegisterService = controlledSaleRegisterService;
  }

  @GetMapping
  public ApiResponse<RegisterResponse> list(
      Authentication authentication,
      @RequestParam(required = false) UUID branchId,
      @RequestParam(required = false) String schedule,
      @RequestParam(required = false) UUID productId,
      @RequestParam(required = false) UUID patientId,
      @RequestParam(required = false) UUID pharmacistUserId,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new RegisterResponse(
            controlledSaleRegisterService
                .list(
                    principal, branchId, schedule, productId, patientId, pharmacistUserId, from, to)
                .items()
                .stream()
                .map(ControlledSaleRegisterController::toLine)
                .toList()));
  }

  @GetMapping(value = "/export", produces = "text/csv")
  public ResponseEntity<String> export(
      Authentication authentication,
      @RequestParam(required = false) String format,
      @RequestParam(required = false) UUID branchId,
      @RequestParam(required = false) String schedule,
      @RequestParam(required = false) UUID productId,
      @RequestParam(required = false) UUID patientId,
      @RequestParam(required = false) UUID pharmacistUserId,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    String csv =
        controlledSaleRegisterService.exportCsv(
            principal,
            format,
            branchId,
            schedule,
            productId,
            patientId,
            pharmacistUserId,
            from,
            to);
    String filename =
        "ndps".equalsIgnoreCase(format) ? "ndps-sale-register.csv" : "controlled-sale-register.csv";
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(new MediaType("text", "csv"))
        .body(csv);
  }

  private static LineResponse toLine(ControlledSaleLineView view) {
    return new LineResponse(
        view.id(),
        view.kind(),
        view.productId(),
        view.productName(),
        view.sku(),
        view.scheduleClassification() == null ? null : view.scheduleClassification().name(),
        view.batchId(),
        view.batchNumber(),
        view.quantity(),
        view.prescriptionReference(),
        view.patientId(),
        view.patientName(),
        view.pharmacistUserId(),
        view.pharmacistName(),
        view.pharmacistRegistration(),
        view.occurredAt(),
        view.salesInvoiceId(),
        view.salesInvoiceLineId(),
        view.salesReturnId(),
        view.salesReturnLineId(),
        view.sourceRegisterId());
  }

  public record RegisterResponse(List<LineResponse> items) {}

  public record LineResponse(
      UUID id,
      String kind,
      UUID productId,
      String productName,
      String sku,
      String scheduleClassification,
      UUID batchId,
      String batchNumber,
      BigDecimal quantity,
      String prescriptionReference,
      UUID patientId,
      String patientName,
      UUID pharmacistUserId,
      String pharmacistName,
      String pharmacistRegistration,
      Instant occurredAt,
      UUID salesInvoiceId,
      UUID salesInvoiceLineId,
      UUID salesReturnId,
      UUID salesReturnLineId,
      UUID sourceRegisterId) {}
}
