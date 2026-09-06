package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.WhatsAppProviderStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WhatsAppProviderStatusRepository
    extends JpaRepository<WhatsAppProviderStatus, UUID> {

  Optional<WhatsAppProviderStatus> findFirstByOrderBySyncedAtDesc();
}
