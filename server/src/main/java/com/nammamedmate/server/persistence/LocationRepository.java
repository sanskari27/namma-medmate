package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Location;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, UUID> {

  Optional<Location> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);
}
