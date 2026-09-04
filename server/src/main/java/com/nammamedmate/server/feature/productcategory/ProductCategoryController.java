package com.nammamedmate.server.feature.productcategory;

import com.nammamedmate.server.application.productcategory.ProductCategoryService;
import com.nammamedmate.server.application.productcategory.ProductCategoryView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/product-categories")
public class ProductCategoryController {

  private final ProductCategoryService productCategoryService;

  public ProductCategoryController(ProductCategoryService productCategoryService) {
    this.productCategoryService = productCategoryService;
  }

  @GetMapping
  public ApiResponse<CategoryListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new CategoryListResponse(
            productCategoryService.list(principal).stream().map(this::toResponse).toList()));
  }

  @PostMapping
  public ApiResponse<CategoryResponse> create(
      Authentication authentication, @Valid @RequestBody CreateCategoryRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(productCategoryService.create(principal, request.name())));
  }

  private CategoryResponse toResponse(ProductCategoryView view) {
    return new CategoryResponse(
        view.id(), view.tenantId(), view.name(), view.createdAt(), view.updatedAt());
  }

  public record CategoryListResponse(List<CategoryResponse> items) {}

  public record CategoryResponse(
      UUID id, UUID tenantId, String name, Instant createdAt, Instant updatedAt) {}

  public record CreateCategoryRequest(@NotBlank @Size(max = 200) String name) {}
}
