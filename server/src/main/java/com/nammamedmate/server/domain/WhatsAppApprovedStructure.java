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
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "whatsapp_approved_structure")
@Getter
@Setter
public class WhatsAppApprovedStructure {

  @Id private UUID id;

  @Column(name = "unique_name", nullable = false, length = 64)
  private String uniqueName;

  @Column(nullable = false, columnDefinition = "text")
  private String body;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "tenant_slots", nullable = false, columnDefinition = "jsonb")
  private List<String> tenantSlots = new ArrayList<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "runtime_slots", nullable = false, columnDefinition = "jsonb")
  private List<String> runtimeSlots = new ArrayList<>();

  @Column(name = "meta_template_id", nullable = false, length = 64)
  private String metaTemplateId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private WhatsAppApprovalStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
