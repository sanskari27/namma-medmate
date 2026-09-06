package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.TenantSubscription;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TenantSubscriptionRepository extends JpaRepository<TenantSubscription, UUID> {

  Optional<TenantSubscription> findByTenantId(UUID tenantId);

  boolean existsByTenantId(UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TenantSubscription s where s.tenantId = :tenantId")
  Optional<TenantSubscription> lockByTenantId(@Param("tenantId") UUID tenantId);
}
