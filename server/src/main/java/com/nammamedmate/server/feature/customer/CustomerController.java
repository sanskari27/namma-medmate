package com.nammamedmate.server.feature.customer;

import com.nammamedmate.server.application.customer.CustomerService;
import com.nammamedmate.server.application.customer.CustomerView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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

  public CustomerController(CustomerService customerService) {
    this.customerService = customerService;
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

  public record CustomerListResponse(List<CustomerResponse> items) {}

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
}
