package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.NotificationDelivery;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, UUID> {

  List<NotificationDelivery> findByEventIdOrderByCreatedAtAsc(UUID eventId);
}
