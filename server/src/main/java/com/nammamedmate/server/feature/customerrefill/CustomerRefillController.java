package com.nammamedmate.server.feature.customerrefill;

import com.nammamedmate.server.application.customerrefill.CustomerRefillDueView;
import com.nammamedmate.server.application.customerrefill.CustomerRefillListView;
import com.nammamedmate.server.application.customerrefill.CustomerRefillService;
import com.nammamedmate.server.application.customerrefill.CustomerRefillView;
import com.nammamedmate.server.application.customerrefill.CustomerTagListView;
import com.nammamedmate.server.application.customerrefill.CustomerTagView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerRefillController {

  private final CustomerRefillService customerRefillService;

  public CustomerRefillController(CustomerRefillService customerRefillService) {
    this.customerRefillService = customerRefillService;
  }

  @GetMapping("/refills/due")
  public ApiResponse<DueListResponse> listDue(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    CustomerRefillDueView view = customerRefillService.listDue(principal);
    return ApiResponse.ok(
        new DueListResponse(
            view.items().stream()
                .map(
                    item ->
                        new DueItemResponse(
                            item.refillId(),
                            item.customerId(),
                            item.customerName(),
                            item.customerPhone(),
                            item.medicineName(),
                            item.intervalDays(),
                            item.nextDueOn(),
                            item.version()))
                .toList()));
  }

  @GetMapping("/{id}/refills")
  public ApiResponse<RefillListResponse> listRefills(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    CustomerRefillListView view = customerRefillService.listRefills(principal, id);
    return ApiResponse.ok(
        new RefillListResponse(
            view.items().stream().map(CustomerRefillController::toRefill).toList()));
  }

  @PostMapping("/{id}/refills")
  public ApiResponse<RefillResponse> createRefill(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody CreateRefillRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toRefill(
            customerRefillService.createRefill(
                principal,
                id,
                request.medicineName(),
                request.intervalDays(),
                request.nextDueOn())));
  }

  @PutMapping("/{id}/refills/{refillId}")
  public ApiResponse<RefillResponse> updateRefill(
      Authentication authentication,
      @PathVariable UUID id,
      @PathVariable UUID refillId,
      @Valid @RequestBody UpdateRefillRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toRefill(
            customerRefillService.updateRefill(
                principal,
                id,
                refillId,
                request.intervalDays(),
                request.nextDueOn(),
                request.expectedVersion())));
  }

  @DeleteMapping("/{id}/refills/{refillId}")
  public ApiResponse<Void> deleteRefill(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID refillId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    customerRefillService.deleteRefill(principal, id, refillId);
    return ApiResponse.ok(null);
  }

  @GetMapping("/tags")
  public ApiResponse<TagListResponse> listTags(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toTagList(customerRefillService.listTags(principal)));
  }

  @PostMapping("/tags")
  public ApiResponse<TagResponse> createTag(
      Authentication authentication, @Valid @RequestBody CreateTagRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toTag(customerRefillService.createTag(principal, request.name())));
  }

  @DeleteMapping("/tags/{tagId}")
  public ApiResponse<Void> deleteTag(Authentication authentication, @PathVariable UUID tagId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    customerRefillService.deleteTag(principal, tagId);
    return ApiResponse.ok(null);
  }

  @GetMapping("/{id}/tags")
  public ApiResponse<TagListResponse> listCustomerTags(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toTagList(customerRefillService.listCustomerTags(principal, id)));
  }

  @PutMapping("/{id}/tags")
  public ApiResponse<TagListResponse> replaceCustomerTags(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody ReplaceTagsRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toTagList(customerRefillService.replaceCustomerTags(principal, id, request.tagIds())));
  }

  private static RefillResponse toRefill(CustomerRefillView view) {
    return new RefillResponse(
        view.id(),
        view.customerId(),
        view.medicineName(),
        view.intervalDays(),
        view.nextDueOn(),
        view.version(),
        view.updatedAt());
  }

  private static TagListResponse toTagList(CustomerTagListView view) {
    return new TagListResponse(view.items().stream().map(CustomerRefillController::toTag).toList());
  }

  private static TagResponse toTag(CustomerTagView view) {
    return new TagResponse(view.id(), view.name(), view.createdAt());
  }

  public record DueListResponse(List<DueItemResponse> items) {}

  public record DueItemResponse(
      UUID refillId,
      UUID customerId,
      String customerName,
      String customerPhone,
      String medicineName,
      int intervalDays,
      LocalDate nextDueOn,
      long version) {}

  public record RefillListResponse(List<RefillResponse> items) {}

  public record RefillResponse(
      UUID id,
      UUID customerId,
      String medicineName,
      int intervalDays,
      LocalDate nextDueOn,
      long version,
      Instant updatedAt) {}

  public record CreateRefillRequest(
      @NotBlank @Size(max = 200) String medicineName,
      @Min(1) Integer intervalDays,
      LocalDate nextDueOn) {}

  public record UpdateRefillRequest(
      @NotNull @Min(1) Integer intervalDays,
      @NotNull LocalDate nextDueOn,
      @NotNull Long expectedVersion) {}

  public record TagListResponse(List<TagResponse> items) {}

  public record TagResponse(UUID id, String name, Instant createdAt) {}

  public record CreateTagRequest(@NotBlank @Size(max = 80) String name) {}

  public record ReplaceTagsRequest(@NotNull List<UUID> tagIds) {}
}
