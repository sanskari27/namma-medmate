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
    String customerPhone,
    UUID doctorId,
    String doctorName,
    String doctorRegistration,
    String prescriptionReference,
    Instant issuedAt,
    Instant expiresAt,
    PrescriptionReferenceStatus status,
    PrescriptionReferenceArchiveReason archiveReason,
    Instant archivedAt,
    UUID firstInvoiceId,
    int version,
    int invoiceCount,
    long billedPaise,
    List<SourceInvoice> invoices) {

  public record SourceInvoice(
      UUID id, String invoiceNumber, UUID branchId, Instant completedAt, long totalPaise) {}
}
