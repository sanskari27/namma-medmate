package com.nammamedmate.server.application.prescription;

import com.nammamedmate.server.domain.PrescriptionReferenceArchiveReason;
import com.nammamedmate.server.domain.PrescriptionReferenceStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PrescriptionReferenceView(
    UUID id,
    UUID tenantId,
    UUID branchId,
    String branchName,
    UUID customerId,
    String customerName,
    UUID doctorId,
    String prescriptionReference,
    Instant issuedAt,
    Instant expiresAt,
    PrescriptionReferenceStatus status,
    PrescriptionReferenceArchiveReason archiveReason,
    Instant archivedAt,
    UUID firstInvoiceId,
    int version,
    List<SourceInvoice> invoices) {

  public record SourceInvoice(
      UUID id, String invoiceNumber, UUID branchId, Instant completedAt, long totalPaise) {}
}
