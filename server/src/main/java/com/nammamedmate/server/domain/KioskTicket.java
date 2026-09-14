package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "kiosk_ticket")
@Getter
@Setter
public class KioskTicket {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "session_id", nullable = false)
  private UUID sessionId;

  @Column(nullable = false)
  private int token;

  @Column(name = "walk_in_name", length = 120)
  private String walkInName;

  @Column(name = "pickup_request", nullable = false, length = 500)
  private String pickupRequest;

  @Column(name = "payment_method", length = 32)
  private String paymentMethod;

  @Column(name = "requires_rx", nullable = false)
  private boolean requiresRx;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "items_json", nullable = false, columnDefinition = "jsonb")
  private List<Map<String, Object>> itemsJson = new ArrayList<>();

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private KioskTicketStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
