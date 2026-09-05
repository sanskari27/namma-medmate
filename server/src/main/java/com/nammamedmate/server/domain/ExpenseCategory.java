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
@Table(name = "expense_category")
@Getter
@Setter
public class ExpenseCategory {

  @Id private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(nullable = false, length = 32)
  private String code;

  @Column(nullable = false, length = 80)
  private String label;

  @Column(nullable = false)
  private boolean system;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
