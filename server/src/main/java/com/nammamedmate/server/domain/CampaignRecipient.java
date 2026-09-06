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
@Table(name = "campaign_recipient")
@IdClass(CampaignRecipient.Pk.class)
@Getter
@Setter
public class CampaignRecipient {

  @Id
  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Id
  @Column(name = "campaign_id", nullable = false)
  private UUID campaignId;

  @Id
  @Column(name = "customer_id", nullable = false)
  private UUID customerId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Getter
  @Setter
  public static class Pk implements Serializable {
    private UUID tenantId;
    private UUID campaignId;
    private UUID customerId;

    @Override
    public boolean equals(Object o) {
      if (this == o) {
        return true;
      }
      if (!(o instanceof Pk pk)) {
        return false;
      }
      return Objects.equals(tenantId, pk.tenantId)
          && Objects.equals(campaignId, pk.campaignId)
          && Objects.equals(customerId, pk.customerId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(tenantId, campaignId, customerId);
    }
  }
}
