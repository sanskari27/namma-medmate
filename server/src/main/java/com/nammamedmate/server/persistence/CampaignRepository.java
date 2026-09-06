package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Campaign;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {

  Optional<Campaign> findByIdAndTenantId(UUID id, UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from Campaign c where c.id = :id and c.tenantId = :tenantId")
  Optional<Campaign> lockByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

  List<Campaign> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
