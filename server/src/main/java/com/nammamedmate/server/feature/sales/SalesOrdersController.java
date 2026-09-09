package com.nammamedmate.server.feature.sales;

import com.nammamedmate.server.application.sales.SalesOrderListView;
import com.nammamedmate.server.application.sales.SalesOrderRowView;
import com.nammamedmate.server.application.sales.SalesOrderService;
import com.nammamedmate.server.domain.PaymentMode;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SalesOrderChannel;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/orders")
public class SalesOrdersController {

  private final SalesOrderService salesOrderService;

  public SalesOrdersController(SalesOrderService salesOrderService) {
    this.salesOrderService = salesOrderService;
  }

  @GetMapping
  public ApiResponse<SalesOrderListResponse> list(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    SalesOrderListView view = salesOrderService.list(principal);
    return ApiResponse.ok(
        new SalesOrderListResponse(view.items().stream().map(OrderRowResponse::from).toList()));
  }

  public record SalesOrderListResponse(List<OrderRowResponse> items) {}

  public record OrderRowResponse(
      UUID id,
      String invoiceNumber,
      SalesInvoiceStatus status,
      SalesOrderChannel channel,
      UUID customerId,
      String customerName,
      String customerPhone,
      String customerAddress,
      boolean hasPrescription,
      String prescriptionReference,
      boolean prescriptionVerified,
      boolean hasPrescriptionAttachment,
      String prescriptionAttachmentFilename,
      String prescriptionAttachmentContentType,
      int itemUnitCount,
      int lineCount,
      String itemSummary,
      String paymentLabel,
      long amountPaidPaise,
      long amountDuePaise,
      long subtotalPaise,
      long taxPaise,
      long totalPaise,
      Instant createdAt,
      Instant completedAt,
      Instant updatedAt,
      List<PaymentResponse> payments,
      List<LineResponse> lines) {

    static OrderRowResponse from(SalesOrderRowView row) {
      return new OrderRowResponse(
          row.id(),
          row.invoiceNumber(),
          row.status(),
          row.channel(),
          row.customerId(),
          row.customerName(),
          row.customerPhone(),
          row.customerAddress(),
          row.hasPrescription(),
          row.prescriptionReference(),
          row.prescriptionVerified(),
          row.hasPrescriptionAttachment(),
          row.prescriptionAttachmentFilename(),
          row.prescriptionAttachmentContentType(),
          row.itemUnitCount(),
          row.lineCount(),
          row.itemSummary(),
          row.paymentLabel(),
          row.amountPaidPaise(),
          row.amountDuePaise(),
          row.subtotalPaise(),
          row.taxPaise(),
          row.totalPaise(),
          row.createdAt(),
          row.completedAt(),
          row.updatedAt(),
          row.payments().stream()
              .map(
                  payment ->
                      new PaymentResponse(payment.mode(), payment.amountPaise(), payment.reference()))
              .toList(),
          row.lines().stream()
              .map(
                  line ->
                      new LineResponse(
                          line.id(),
                          line.productName(),
                          line.batchNumber(),
                          line.quantity(),
                          line.sellingPricePaise(),
                          line.lineTotalPaise()))
              .toList());
    }
  }

  public record PaymentResponse(PaymentMode mode, long amountPaise, String reference) {}

  public record LineResponse(
      UUID id,
      String productName,
      String batchNumber,
      BigDecimal quantity,
      long sellingPricePaise,
      long lineTotalPaise) {}
}
