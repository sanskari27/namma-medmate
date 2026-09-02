package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AuditEvent;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

  List<AuditEvent> findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
      UUID tenantId, Instant cutoff);

  List<AuditEvent> findByTenantIdIsNullAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
      Instant cutoff);

  List<AuditEvent> findByCreatedAtGreaterThanEqualOrderByCreatedAtDesc(Instant cutoff);

  void deleteByCreatedAtBefore(Instant cutoff);
}
