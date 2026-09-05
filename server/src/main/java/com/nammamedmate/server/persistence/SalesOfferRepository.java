package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.OfferStatus;
import com.nammamedmate.server.domain.SalesOffer;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesOfferRepository extends JpaRepository<SalesOffer, UUID> {

  Optional<SalesOffer> findByIdAndTenantId(UUID id, UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select o from SalesOffer o where o.id = :id and o.tenantId = :tenantId")
  Optional<SalesOffer> lockByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

  List<SalesOffer> findAllByTenantIdOrderByPriorityDescNameAsc(UUID tenantId);

  List<SalesOffer> findAllByTenantIdAndStatus(UUID tenantId, OfferStatus status);

  List<SalesOffer> findAllByTenantId(UUID tenantId);
}
