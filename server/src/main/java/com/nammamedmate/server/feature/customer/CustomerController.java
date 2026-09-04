package com.nammamedmate.server.feature.customer;

import com.nammamedmate.server.application.customer.CustomerMergePreview;
import com.nammamedmate.server.application.customer.CustomerMergeService;
import com.nammamedmate.server.application.customer.CustomerService;
import com.nammamedmate.server.application.customer.CustomerView;
import com.nammamedmate.server.application.customerhistory.CustomerHistoryService;
import com.nammamedmate.server.application.customerhistory.CustomerHistoryView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

  private final CustomerService customerService;
  private final CustomerMergeService customerMergeService;
  private final CustomerHistoryService customerHistoryService;

  public CustomerController(
      CustomerService customerService,
      CustomerMergeService customerMergeService,
      CustomerHistoryService customerHistoryService) {
    this.customerService = customerService;
    this.customerMergeService = customerMergeService;
    this.customerHistoryService = customerHistoryService;
  }

  @GetMapping
  public ApiResponse<CustomerListResponse> list(
      Authentication authentication, @RequestParam(required = false) String q) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new CustomerListResponse(
            customerService.list(principal, q).stream().map(this::toResponse).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<CustomerResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(customerService.get(principal, id)));
  }

  @GetMapping("/{id}/history")
  public ApiResponse<HistoryResponse> history(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    CustomerHistoryView view = customerHistoryService.list(principal, id);
    return ApiResponse.ok(
        new HistoryResponse(
            view.items().stream()
                .map(
                    item ->
                        new HistoryItemResponse(
                            item.id(),
                            item.customerId(),
                            item.type().name(),
                            item.summary(),
                            item.prescriptionReference(),
                            item.doctorId(),
                            item.doctorName(),
                            item.invoiceId(),
                            item.amountPaise(),
                            item.occurredAt()))
                .toList()));
  }

  @PostMapping
  public ApiResponse<CustomerResponse> create(
      Authentication authentication, @Valid @RequestBody UpsertCustomerRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            customerService.create(
                principal,
                request.name(),
                request.phone(),
                request.email(),
                request.dateOfBirth(),
                request.gender(),
                request.address(),
                request.bloodGroup(),
                request.allergies(),
                request.chronicConditions())));
  }

  @PostMapping("/merge")
  public ApiResponse<?> merge(
      Authentication authentication, @Valid @RequestBody MergeCustomerRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    MergeMode mode = parseMode(request.mode());
    if (mode == MergeMode.PREVIEW) {
      CustomerMergePreview preview =
          customerMergeService.preview(principal, request.survivorId(), request.duplicateId());
      return ApiResponse.ok(toMergePreviewResponse(preview));
    }
    return ApiResponse.ok(
        toResponse(
            customerMergeService.execute(
                principal,
                request.survivorId(),
                request.duplicateId(),
                request.resolutions() == null ? Map.of() : request.resolutions())));
  }

  @PatchMapping("/{id}")
  public ApiResponse<CustomerResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpsertCustomerRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            customerService.update(
                principal,
                id,
                request.name(),
                request.phone(),
                request.email(),
                request.dateOfBirth(),
                request.gender(),
                request.address(),
                request.bloodGroup(),
                request.allergies(),
                request.chronicConditions())));
  }

  private CustomerResponse toResponse(CustomerView view) {
    return new CustomerResponse(
        view.id(),
        view.tenantId(),
        view.name(),
        view.phone(),
        view.email(),
        view.dateOfBirth(),
        view.gender(),
        view.address(),
        view.bloodGroup(),
        view.allergies(),
        view.chronicConditions(),
        view.createdAt(),
        view.updatedAt());
  }

  private MergePreviewResponse toMergePreviewResponse(CustomerMergePreview preview) {
    return new MergePreviewResponse(
        preview.mode(),
        toResponse(preview.survivor()),
        toResponse(preview.duplicate()),
        preview.fields().stream()
            .map(
                field ->
                    new MergeFieldResponse(
                        field.field(),
                        field.status(),
                        field.survivorValue(),
                        field.duplicateValue()))
            .toList(),
        preview.conflicts(),
        new MergeLinkedRecordsResponse(preview.linkedRecords().notificationEvents()));
  }

  private static MergeMode parseMode(String mode) {
    if (mode == null || mode.isBlank()) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    try {
      return MergeMode.valueOf(mode.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new com.nammamedmate.server.shared.exception.ApiException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public record CustomerListResponse(List<CustomerResponse> items) {}

  public record HistoryResponse(List<HistoryItemResponse> items) {}

  public record HistoryItemResponse(
      UUID id,
      UUID customerId,
      String type,
      String summary,
      String prescriptionReference,
      UUID doctorId,
      String doctorName,
      UUID invoiceId,
      Long amountPaise,
      Instant occurredAt) {}

  public record CustomerResponse(
      UUID id,
      UUID tenantId,
      String name,
      String phone,
      String email,
      LocalDate dateOfBirth,
      String gender,
      String address,
      String bloodGroup,
      String allergies,
      String chronicConditions,
      Instant createdAt,
      Instant updatedAt) {}

  public record UpsertCustomerRequest(
      @NotBlank @Size(max = 200) String name,
      @NotBlank @Size(max = 32) String phone,
      @Size(max = 255) String email,
      LocalDate dateOfBirth,
      @Size(max = 32) String gender,
      @Size(max = 500) String address,
      @Size(max = 16) String bloodGroup,
      String allergies,
      String chronicConditions) {}

  public record MergeCustomerRequest(
      @NotBlank String mode,
      @NotNull UUID survivorId,
      @NotNull UUID duplicateId,
      Map<String, String> resolutions) {}

  public record MergePreviewResponse(
      String mode,
      CustomerResponse survivor,
      CustomerResponse duplicate,
      List<MergeFieldResponse> fields,
      List<String> conflicts,
      MergeLinkedRecordsResponse linkedRecords) {}

  public record MergeFieldResponse(
      String field, String status, String survivorValue, String duplicateValue) {}

  public record MergeLinkedRecordsResponse(long notificationEvents) {}

  private enum MergeMode {
    PREVIEW,
    EXECUTE
  }
}
