package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "kyc_document")
@Getter
@Setter
public class KycDocument {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "submission_id", nullable = false)
  private UUID submissionId;

  @Enumerated(EnumType.STRING)
  @Column(name = "doc_type", nullable = false, length = 32)
  private KycDocType docType;

  @Column(name = "content_type", nullable = false, length = 100)
  private String contentType;

  @Column(name = "byte_size", nullable = false)
  private long byteSize;

  @Column(name = "storage_key", nullable = false, length = 512)
  private String storageKey;

  @Column(name = "original_filename", nullable = false)
  private String originalFilename;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
