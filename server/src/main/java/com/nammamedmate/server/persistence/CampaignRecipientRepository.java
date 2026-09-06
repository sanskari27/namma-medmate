package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CampaignRecipient;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampaignRecipientRepository
    extends JpaRepository<CampaignRecipient, CampaignRecipient.Pk> {

  List<CampaignRecipient> findAllByTenantIdAndCampaignId(UUID tenantId, UUID campaignId);

  long countByTenantIdAndCampaignId(UUID tenantId, UUID campaignId);
}
