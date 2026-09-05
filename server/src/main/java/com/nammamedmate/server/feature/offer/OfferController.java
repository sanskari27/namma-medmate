package com.nammamedmate.server.feature.offer;

import com.nammamedmate.server.application.offer.OfferCommand;
import com.nammamedmate.server.application.offer.OfferListResult;
import com.nammamedmate.server.application.offer.OfferService;
import com.nammamedmate.server.application.offer.OfferView;
import com.nammamedmate.server.domain.OfferBenefitType;
import com.nammamedmate.server.domain.OfferKind;
import com.nammamedmate.server.domain.OfferProductSlot;
import com.nammamedmate.server.domain.OfferStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.exception.ApiException;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/offers")
public class OfferController {

  private final OfferService offerService;

  public OfferController(OfferService offerService) {
    this.offerService = offerService;
  }

  @GetMapping
  public ApiResponse<OfferListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    OfferListResult result = offerService.list(principal);
    return ApiResponse.ok(
        new OfferListResponse(result.items().stream().map(this::toResponse).toList()));
  }

  @GetMapping("/{id}")
  public ApiResponse<OfferResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(offerService.get(principal, id)));
  }

  @PostMapping
  public ApiResponse<OfferResponse> create(
      Authentication authentication, @Valid @RequestBody UpsertOfferRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(offerService.create(principal, toCommand(request))));
  }

  @PatchMapping("/{id}")
  public ApiResponse<OfferResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpsertOfferRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(offerService.update(principal, id, toCommand(request))));
  }

  @PostMapping("/{id}/publish")
  public ApiResponse<OfferResponse> publish(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody VersionRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(offerService.publish(principal, id, request.expectedVersion())));
  }

  @PostMapping("/{id}/deactivate")
  public ApiResponse<OfferResponse> deactivate(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody VersionRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(offerService.deactivate(principal, id, request.expectedVersion())));
  }

  private OfferCommand toCommand(UpsertOfferRequest request) {
    return new OfferCommand(
        request.name(),
        parseKind(request.kind()),
        request.priority(),
        request.startsAt(),
        request.endsAt(),
        request.buyQuantity(),
        request.getQuantity(),
        parseBenefit(request.benefitType()),
        request.benefitValue(),
        request.expectedVersion(),
        request.products().stream()
            .map(row -> new OfferCommand.ProductRef(row.productId(), parseSlot(row.slot())))
            .toList());
  }

  private OfferResponse toResponse(OfferView view) {
    return new OfferResponse(
        view.id(),
        view.tenantId(),
        view.name(),
        view.kind(),
        view.status(),
        view.priority(),
        view.startsAt(),
        view.endsAt(),
        view.buyQuantity(),
        view.getQuantity(),
        view.benefitType(),
        view.benefitValue(),
        view.version(),
        view.products().stream()
            .map(row -> new ProductResponse(row.productId(), row.slot()))
            .toList(),
        view.createdAt(),
        view.updatedAt());
  }

  private static OfferKind parseKind(String kind) {
    try {
      return OfferKind.valueOf(kind.trim());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  private static OfferBenefitType parseBenefit(String type) {
    try {
      return OfferBenefitType.valueOf(type.trim());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  private static OfferProductSlot parseSlot(String slot) {
    try {
      return OfferProductSlot.valueOf(slot.trim());
    } catch (RuntimeException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
  }

  public record UpsertOfferRequest(
      @NotBlank @Size(max = 120) String name,
      @NotBlank String kind,
      @NotNull Integer priority,
      Instant startsAt,
      Instant endsAt,
      Integer buyQuantity,
      Integer getQuantity,
      @NotBlank String benefitType,
      Long benefitValue,
      Integer expectedVersion,
      @NotEmpty List<@Valid ProductRequest> products) {}

  public record ProductRequest(@NotNull UUID productId, @NotBlank String slot) {}

  public record VersionRequest(@NotNull Integer expectedVersion) {}

  public record OfferListResponse(List<OfferResponse> items) {}

  public record OfferResponse(
      UUID id,
      UUID tenantId,
      String name,
      OfferKind kind,
      OfferStatus status,
      int priority,
      Instant startsAt,
      Instant endsAt,
      Integer buyQuantity,
      Integer getQuantity,
      OfferBenefitType benefitType,
      long benefitValue,
      int version,
      List<ProductResponse> products,
      Instant createdAt,
      Instant updatedAt) {}

  public record ProductResponse(UUID productId, OfferProductSlot slot) {}
}
