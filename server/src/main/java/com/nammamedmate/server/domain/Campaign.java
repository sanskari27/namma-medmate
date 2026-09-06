package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "campaign")
@Getter
@Setter
public class Campaign {

  @Id private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false, length = 120)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 24)
  private CampaignStatus status;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "tag_ids", nullable = false, columnDefinition = "jsonb")
  private List<UUID> tagIds = new ArrayList<>();

  @Column(name = "template_unique_name", nullable = false, length = 64)
  private String templateUniqueName;

  @Column(name = "template_namespace_name", nullable = false, length = 128)
  private String templateNamespaceName;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "template_variables", nullable = false, columnDefinition = "jsonb")
  private Map<String, String> templateVariables = new LinkedHashMap<>();

  @Column(name = "previewed_at")
  private Instant previewedAt;

  @Column(name = "preview_recipient_count")
  private Integer previewRecipientCount;

  @Column(name = "frozen_at")
  private Instant frozenAt;

  @Column(name = "frozen_recipient_count")
  private Integer frozenRecipientCount;

  @Column(nullable = false)
  private int version = 1;

  @Column(name = "created_by_user_id")
  private UUID createdByUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
}
