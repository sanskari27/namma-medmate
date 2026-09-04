package com.nammamedmate.server.feature.product;

import com.nammamedmate.server.application.product.ProductUnitConvertCommand;
import com.nammamedmate.server.application.product.ProductUnitConvertView;
import com.nammamedmate.server.application.product.ProductUnitService;
import com.nammamedmate.server.application.product.ProductUnitsReplaceCommand;
import com.nammamedmate.server.application.product.ProductUnitsView;
import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products/{id}/units")
public class ProductUnitController {

  private final ProductUnitService productUnitService;

  public ProductUnitController(ProductUnitService productUnitService) {
    this.productUnitService = productUnitService;
  }

  @GetMapping
  public ApiResponse<ProductUnitsResponse> list(
      Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(productUnitService.list(principal, id)));
  }

  @PutMapping
  public ApiResponse<ProductUnitsResponse> replace(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody ReplaceUnitsRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            productUnitService.replace(
                principal,
                id,
                new ProductUnitsReplaceCommand(
                    request.quantityPrecision(),
                    request.units() == null
                        ? List.of()
                        : request.units().stream()
                            .map(
                                u ->
                                    new ProductUnitsReplaceCommand.UnitFactor(
                                        u.unit(), u.factorToBase()))
                            .toList()))));
  }

  @PostMapping("/convert")
  public ApiResponse<ConvertResponse> convert(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody ConvertRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    ProductUnitConvertView view =
        productUnitService.convert(
            principal,
            id,
            new ProductUnitConvertCommand(
                request.quantity(), request.fromUnit(), request.toUnit()));
    return ApiResponse.ok(
        new ConvertResponse(
            view.quantity(),
            view.unit(),
            view.baseQuantity(),
            view.baseUnit(),
            view.displayQuantity(),
            view.displayUnit(),
            view.conversionVersion(),
            view.factorToBase()));
  }

  private static ProductUnitsResponse toResponse(ProductUnitsView view) {
    return new ProductUnitsResponse(
        view.baseUnit(),
        view.quantityPrecision(),
        view.units().stream()
            .map(u -> new UnitResponse(u.unit(), u.factorToBase(), u.version()))
            .toList());
  }

  public record ProductUnitsResponse(
      ProductUnit baseUnit, int quantityPrecision, List<UnitResponse> units) {}

  public record UnitResponse(ProductUnit unit, BigDecimal factorToBase, int version) {}

  public record ReplaceUnitsRequest(
      Integer quantityPrecision, @NotNull List<UnitFactorRequest> units) {}

  public record UnitFactorRequest(@NotNull ProductUnit unit, @NotNull BigDecimal factorToBase) {}

  public record ConvertRequest(
      @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal quantity,
      @NotNull ProductUnit fromUnit,
      ProductUnit toUnit) {}

  public record ConvertResponse(
      BigDecimal quantity,
      ProductUnit unit,
      BigDecimal baseQuantity,
      ProductUnit baseUnit,
      BigDecimal displayQuantity,
      ProductUnit displayUnit,
      Integer conversionVersion,
      BigDecimal factorToBase) {}
}
