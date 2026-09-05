package com.nammamedmate.server.feature.sales;

import com.nammamedmate.server.application.sales.PrescriptionFulfillmentListView;
import com.nammamedmate.server.application.sales.SalesInvoiceService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/prescriptions")
public class SalesPrescriptionController {

  private final SalesInvoiceService salesInvoiceService;

  public SalesPrescriptionController(SalesInvoiceService salesInvoiceService) {
    this.salesInvoiceService = salesInvoiceService;
  }

  @GetMapping
  public ApiResponse<FulfillmentListResponse> list(
      Authentication authentication,
      @RequestParam String reference,
      @RequestParam UUID customerId) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    PrescriptionFulfillmentListView view =
        salesInvoiceService.listFulfillment(principal, reference, customerId);
    return ApiResponse.ok(
        new FulfillmentListResponse(
            view.items().stream()
                .map(
                    item ->
                        new FulfillmentResponse(
                            item.productId(),
                            item.prescribedQuantity(),
                            item.fulfilledQuantity(),
                            item.remainingQuantity()))
                .toList()));
  }

  public record FulfillmentListResponse(List<FulfillmentResponse> items) {}

  public record FulfillmentResponse(
      UUID productId,
      BigDecimal prescribedQuantity,
      BigDecimal fulfilledQuantity,
      BigDecimal remainingQuantity) {}
}
