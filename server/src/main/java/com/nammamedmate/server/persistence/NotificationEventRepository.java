package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.NotificationEvent;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, UUID> {

  Optional<NotificationEvent> findByEventKey(String eventKey);

  long countByCustomerIdAndTenantId(UUID customerId, UUID tenantId);

  @Modifying(clearAutomatically = true)
  @Query(
      """
      update NotificationEvent e
      set e.customerId = :survivorId
      where e.customerId = :duplicateId
        and e.tenantId = :tenantId
      """)
  int repointCustomerId(
      @Param("survivorId") UUID survivorId,
      @Param("duplicateId") UUID duplicateId,
      @Param("tenantId") UUID tenantId);
}
