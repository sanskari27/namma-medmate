package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.SubscriptionPayment;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, UUID> {

  Optional<SubscriptionPayment> findByIdempotencyKey(String idempotencyKey);

  Optional<SubscriptionPayment> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<SubscriptionPayment> findByProviderOrderId(String providerOrderId);

  List<SubscriptionPayment> findAllByOrderByCreatedAtDesc();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from SubscriptionPayment p where p.id = :id and p.tenantId = :tenantId")
  Optional<SubscriptionPayment> lockByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from SubscriptionPayment p where p.providerOrderId = :orderId")
  Optional<SubscriptionPayment> lockByProviderOrderId(@Param("orderId") String orderId);
}
