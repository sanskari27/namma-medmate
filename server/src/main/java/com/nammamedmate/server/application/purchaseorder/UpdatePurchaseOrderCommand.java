package com.nammamedmate.server.application.purchaseorder;

import com.nammamedmate.server.domain.SupplierPaymentTerms;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record UpdatePurchaseOrderCommand(
    UUID supplierId,
    Integer expectedVersion,
    LocalDate expectedDeliveryDate,
    SupplierPaymentTerms paymentTerms,
    String notes,
    List<CreatePurchaseOrderCommand.Line> lines) {}
