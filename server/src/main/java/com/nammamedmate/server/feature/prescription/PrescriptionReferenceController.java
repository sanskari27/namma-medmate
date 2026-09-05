package com.nammamedmate.server.feature.prescription;

import com.nammamedmate.server.application.prescription.PrescriptionReferenceListResult;
import com.nammamedmate.server.application.prescription.PrescriptionReferenceScanner;
import com.nammamedmate.server.application.prescription.PrescriptionReferenceService;
import com.nammamedmate.server.application.prescription.PrescriptionReferenceView;
import com.nammamedmate.server.domain.PrescriptionReferenceArchiveReason;
import com.nammamedmate.server.domain.PrescriptionReferencePolicy;
import com.nammamedmate.server.domain.PrescriptionReferenceStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/prescription-references")
public class PrescriptionReferenceController {

  private final PrescriptionReferenceService referenceService;
  private final PrescriptionReferenceScanner scanner;

  public PrescriptionReferenceController(
      PrescriptionReferenceService referenceService, PrescriptionReferenceScanner scanner) {
    this.referenceService = referenceService;
    this.scanner = scanner;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(
      Authentication authentication, @RequestParam(required = false) String status) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    PrescriptionReferenceStatus filter = PrescriptionReferencePolicy.parseStatus(status);
    PrescriptionReferenceListResult result = referenceService.list(principal, filter);
    return ApiResponse.ok(
        new ListResponse(
            result.items().stream().map(PrescriptionReferenceController::toItem).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<ItemResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toItem(referenceService.get(principal, id)));
  }

  @PostMapping("/scan")
  public ApiResponse<ScanResponse> scan(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    referenceService.assertCanManage(principal);
    int archived = scanner.scanTenant(principal.tenantId(), principal);
    return ApiResponse.ok(new ScanResponse(archived));
  }

  @PostMapping("/{id}/archive")
  public ApiResponse<ItemResponse> archive(
      Authentication authentication,
      @PathVariable UUID id,
      @RequestBody(required = false) ArchiveRequest body) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    Integer expected = body == null ? null : body.expectedVersion();
    return ApiResponse.ok(toItem(referenceService.archive(principal, id, expected)));
  }

  @PostMapping("/{id}/unarchive")
  public ApiResponse<Void> unarchive(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    referenceService.rejectReactivation(principal, id);
    return ApiResponse.ok(null);
  }

  private static ItemResponse toItem(PrescriptionReferenceView view) {
    return new ItemResponse(
        view.id(),
        view.tenantId(),
        view.branchId(),
        view.branchName(),
        view.customerId(),
        view.customerName(),
        view.doctorId(),
        view.prescriptionReference(),
        view.issuedAt(),
        view.expiresAt(),
        view.status(),
        view.archiveReason(),
        view.archivedAt(),
        view.firstInvoiceId(),
        view.version(),
        view.invoices().stream()
            .map(
                invoice ->
                    new InvoiceResponse(
                        invoice.id(),
                        invoice.invoiceNumber(),
                        invoice.branchId(),
                        invoice.completedAt(),
                        invoice.totalPaise()))
            .toList());
  }

  public record ArchiveRequest(Integer expectedVersion) {}

  public record ScanResponse(int archived) {}

  public record ListResponse(List<ItemResponse> items) {}

  public record ItemResponse(
      UUID id,
      UUID tenantId,
      UUID branchId,
      String branchName,
      UUID customerId,
      String customerName,
      UUID doctorId,
      String prescriptionReference,
      Instant issuedAt,
      Instant expiresAt,
      PrescriptionReferenceStatus status,
      PrescriptionReferenceArchiveReason archiveReason,
      Instant archivedAt,
      UUID firstInvoiceId,
      int version,
      List<InvoiceResponse> invoices) {}

  public record InvoiceResponse(
      UUID id, String invoiceNumber, UUID branchId, Instant completedAt, long totalPaise) {}
}
