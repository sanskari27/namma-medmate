package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.domain.ExpensePostingStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExpenseView(
    UUID id,
    UUID tenantId,
    UUID branchId,
    String branchName,
    UUID categoryId,
    String categoryCode,
    String categoryLabel,
    long amountPaise,
    LocalDate occurredOn,
    ExpensePostingStatus status,
    String notes,
    UUID currentEvidenceId,
    int version,
    Instant createdAt,
    Instant updatedAt,
    List<EvidenceView> evidence) {

  public record EvidenceView(
      UUID id, String contentType, long byteSize, String originalFilename, Instant uploadedAt) {}
}
