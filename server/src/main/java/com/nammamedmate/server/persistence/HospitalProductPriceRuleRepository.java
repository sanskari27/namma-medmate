package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalProductPriceRule;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalProductPriceRuleRepository
    extends JpaRepository<HospitalProductPriceRule, UUID> {

  List<HospitalProductPriceRule> findByTenantIdOrderByProductIdAsc(UUID tenantId);

  Optional<HospitalProductPriceRule> findByTenantIdAndProductId(UUID tenantId, UUID productId);

  void deleteByTenantIdAndProductIdNotIn(UUID tenantId, List<UUID> productIds);
}
