package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.NotificationEvent;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, UUID> {

  Optional<NotificationEvent> findByEventKey(String eventKey);
}
