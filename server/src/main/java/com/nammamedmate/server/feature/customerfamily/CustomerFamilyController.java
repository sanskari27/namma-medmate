package com.nammamedmate.server.feature.customerfamily;

import com.nammamedmate.server.application.customerfamily.CustomerFamilyService;
import com.nammamedmate.server.application.customerfamily.CustomerFamilyView;
import com.nammamedmate.server.application.customerfamily.FamilyCreditView;
import com.nammamedmate.server.application.customerfamily.FamilyHistoryView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer-families")
public class CustomerFamilyController {

  private final CustomerFamilyService customerFamilyService;

  public CustomerFamilyController(CustomerFamilyService customerFamilyService) {
    this.customerFamilyService = customerFamilyService;
  }

  @PostMapping
  public ApiResponse<FamilyResponse> create(
      Authentication authentication, @Valid @RequestBody CreateFamilyRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(customerFamilyService.create(principal, request.memberIds())));
  }

  @GetMapping("/{id}")
  public ApiResponse<FamilyResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(customerFamilyService.get(principal, id)));
  }

  @GetMapping
  public ApiResponse<FamilyResponse> findByCustomer(
      Authentication authentication, @RequestParam UUID customerId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(customerFamilyService.findByCustomer(principal, customerId)));
  }

  @PostMapping("/{id}/members")
  public ApiResponse<FamilyResponse> addMember(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody AddMemberRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(customerFamilyService.addMember(principal, id, request.customerId())));
  }

  @DeleteMapping("/{id}/members/{customerId}")
  public ApiResponse<FamilyResponse> removeMember(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID customerId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(customerFamilyService.removeMember(principal, id, customerId)));
  }

  @GetMapping("/{id}/history")
  public ApiResponse<HistoryResponse> history(
      Authentication authentication,
      @PathVariable UUID id,
      @RequestParam(required = false) UUID memberId,
      @RequestParam(required = false) String type) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    FamilyHistoryView view = customerFamilyService.history(principal, id, memberId, type);
    return ApiResponse.ok(
        new HistoryResponse(
            view.items().stream()
                .map(
                    item ->
                        new HistoryItemResponse(
                            item.id(),
                            item.customerId(),
                            item.customerName(),
                            item.type(),
                            item.summary(),
                            item.occurredAt()))
                .toList()));
  }

  @GetMapping("/{id}/credit")
  public ApiResponse<FamilyCreditResponse> credit(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    FamilyCreditView view = customerFamilyService.credit(principal, id);
    return ApiResponse.ok(
        new FamilyCreditResponse(
            view.familyId(),
            view.totalLimitPaise(),
            view.totalBalancePaise(),
            view.totalAvailablePaise(),
            view.members().stream()
                .map(
                    m ->
                        new MemberCreditResponse(
                            m.customerId(),
                            m.customerName(),
                            m.customerPhone(),
                            m.limitPaise(),
                            m.balancePaise(),
                            m.availablePaise(),
                            m.version()))
                .toList(),
            view.entries().stream()
                .map(
                    e ->
                        new CreditLedgerItemResponse(
                            e.id(),
                            e.customerId(),
                            e.customerName(),
                            e.type().name(),
                            e.amountPaise(),
                            e.balanceAfterPaise(),
                            e.invoiceId(),
                            e.settlementMode(),
                            e.settlementReference(),
                            e.occurredAt()))
                .toList()));
  }

  private FamilyResponse toResponse(CustomerFamilyView view) {
    return new FamilyResponse(
        view.id(),
        view.label(),
        view.members().stream().map(m -> new MemberResponse(m.id(), m.name(), m.phone())).toList(),
        view.createdAt());
  }

  public record CreateFamilyRequest(@NotEmpty List<@NotNull UUID> memberIds) {}

  public record AddMemberRequest(@NotNull UUID customerId) {}

  public record FamilyResponse(
      UUID id, String label, List<MemberResponse> members, Instant createdAt) {}

  public record MemberResponse(UUID id, String name, String phone) {}

  public record HistoryResponse(List<HistoryItemResponse> items) {}

  public record HistoryItemResponse(
      UUID id,
      UUID customerId,
      String customerName,
      String type,
      String summary,
      Instant occurredAt) {}

  public record FamilyCreditResponse(
      UUID familyId,
      long totalLimitPaise,
      long totalBalancePaise,
      long totalAvailablePaise,
      List<MemberCreditResponse> members,
      List<CreditLedgerItemResponse> entries) {}

  public record MemberCreditResponse(
      UUID customerId,
      String customerName,
      String customerPhone,
      long limitPaise,
      long balancePaise,
      long availablePaise,
      long version) {}

  public record CreditLedgerItemResponse(
      UUID id,
      UUID customerId,
      String customerName,
      String type,
      long amountPaise,
      long balanceAfterPaise,
      UUID invoiceId,
      String settlementMode,
      String settlementReference,
      Instant occurredAt) {}
}
