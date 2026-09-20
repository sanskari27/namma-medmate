package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalWardStockListView;
import com.nammamedmate.server.application.hospital.HospitalWardStockService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/ward-stock")
public class HospitalWardStockController {

  private final HospitalWardStockService hospitalWardStockService;

  public HospitalWardStockController(HospitalWardStockService hospitalWardStockService) {
    this.hospitalWardStockService = hospitalWardStockService;
  }

  @GetMapping
  public ApiResponse<ListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(hospitalWardStockService.list(principal)));
  }

  private static ListResponse toResponse(HospitalWardStockListView view) {
    return new ListResponse(
        view.items().stream()
            .map(
                item ->
                    new ItemResponse(
                        item.wardId(),
                        item.wardName(),
                        item.productId(),
                        item.productName(),
                        item.sku(),
                        item.quantity(),
                        item.creditPricePaise(),
                        item.valuePaise()))
            .toList());
  }

  public record ListResponse(List<ItemResponse> items) {}

  public record ItemResponse(
      UUID wardId,
      String wardName,
      UUID productId,
      String productName,
      String sku,
      BigDecimal quantity,
      long creditPricePaise,
      long valuePaise) {}
}
