package com.nammamedmate.server.application.compliance;

import com.nammamedmate.server.domain.ScheduleClassification;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ControlledSaleLineView(
    UUID id,
    String kind,
    UUID productId,
    String productName,
    String sku,
    ScheduleClassification scheduleClassification,
    UUID batchId,
    String batchNumber,
    BigDecimal quantity,
    String prescriptionReference,
    UUID patientId,
    String patientName,
    UUID pharmacistUserId,
    String pharmacistName,
    String pharmacistRegistration,
    Instant occurredAt,
    UUID salesInvoiceId,
    UUID salesInvoiceLineId,
    UUID salesReturnId,
    UUID salesReturnLineId,
    UUID sourceRegisterId) {}
