package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "customer_tag_assignment")
@IdClass(CustomerTagAssignment.Pk.class)
@Getter
@Setter
public class CustomerTagAssignment {

  @Id
  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Id
  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Id
  @Column(name = "tag_id", nullable = false)
  private UUID tagId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Getter
  @Setter
  public static class Pk implements Serializable {
    private UUID tenantId;
    private UUID customerId;
    private UUID tagId;

    @Override
    public boolean equals(Object o) {
      if (this == o) {
        return true;
      }
      if (!(o instanceof Pk pk)) {
        return false;
      }
      return Objects.equals(tenantId, pk.tenantId)
          && Objects.equals(customerId, pk.customerId)
          && Objects.equals(tagId, pk.tagId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(tenantId, customerId, tagId);
    }
  }
}
