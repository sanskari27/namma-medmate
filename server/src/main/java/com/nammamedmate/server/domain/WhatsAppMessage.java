package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "whatsapp_message")
@Getter
@Setter
public class WhatsAppMessage {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private WhatsAppMessageKind kind;

  @Column(name = "source_id", nullable = false)
  private UUID sourceId;

  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "campaign_id")
  private UUID campaignId;

  @Column(name = "template_unique_name", nullable = false, length = 64)
  private String templateUniqueName;

  @Column(name = "namespace_name", nullable = false, length = 128)
  private String namespaceName;

  @Column(nullable = false, length = 16)
  private String phone;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private Map<String, String> variables = new LinkedHashMap<>();

  @Column(nullable = false, columnDefinition = "text")
  private String preview;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private WhatsAppMessageStatus status;

  @Column(name = "provider_message_id", length = 128)
  private String providerMessageId;

  @Column(name = "failure_code", length = 64)
  private String failureCode;

  @Column(name = "idempotency_key", nullable = false, length = 160)
  private String idempotencyKey;

  @Column(name = "attempt_count", nullable = false)
  private int attemptCount;

  @Column(name = "last_attempt_at")
  private Instant lastAttemptAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
