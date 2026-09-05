package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SalesOfferProduct;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOfferProductRepository extends JpaRepository<SalesOfferProduct, UUID> {

  List<SalesOfferProduct> findAllByOfferIdAndTenantId(UUID offerId, UUID tenantId);

  List<SalesOfferProduct> findAllByTenantIdAndOfferIdIn(UUID tenantId, List<UUID> offerIds);

  void deleteByOfferIdAndTenantId(UUID offerId, UUID tenantId);
}
