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
@Table(name = "subscription_payment")
@Getter
@Setter
public class SubscriptionPayment {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "upgrade_intent_id", nullable = false)
  private UUID upgradeIntentId;

  @Enumerated(EnumType.STRING)
  @Column(name = "plan_code", nullable = false, length = 32)
  private PlanCode planCode;

  @Column(name = "amount_paise", nullable = false)
  private int amountPaise;

  @Column(nullable = false, length = 3)
  private String currency = "INR";

  @Column(nullable = false, length = 32)
  private String provider = CashfreeBillingPolicy.PROVIDER;

  @Column(name = "provider_order_id", nullable = false, length = 128)
  private String providerOrderId;

  @Column(name = "payment_session_id", length = 256)
  private String paymentSessionId;

  @Column(name = "checkout_url", length = 512)
  private String checkoutUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private SubscriptionPaymentStatus status = SubscriptionPaymentStatus.PENDING;

  @Column(name = "provider_payment_id", length = 128)
  private String providerPaymentId;

  @Column(name = "signature_verified", nullable = false)
  private boolean signatureVerified;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "payload_snapshot", columnDefinition = "jsonb")
  private Map<String, Object> payloadSnapshot = new LinkedHashMap<>();

  @Column(name = "error_code", length = 64)
  private String errorCode;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "completed_at")
  private Instant completedAt;
}
