package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "audit_event")
@Getter
@Setter
public class AuditEvent {

  @Id private UUID id;

  @Column(name = "user_id")
  private UUID userId;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "branch_id")
  private UUID branchId;

  @Column(nullable = false, length = 64)
  private String action;

  @Column(nullable = false, length = 32)
  private String outcome;

  @Column(name = "attempted_identity", length = 320)
  private String attemptedIdentity;

  @Column(name = "source_ip", length = 64)
  private String sourceIp;

  @Column(name = "user_agent", length = 512)
  private String userAgent;

  @Column(name = "session_id")
  private UUID sessionId;

  @Column(name = "context_json")
  private String contextJson;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
