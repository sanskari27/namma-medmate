package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.WhatsAppTenantTemplate;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WhatsAppTenantTemplateRepository
    extends JpaRepository<WhatsAppTenantTemplate, UUID> {

  List<WhatsAppTenantTemplate> findAllByTenantId(UUID tenantId);

  Optional<WhatsAppTenantTemplate> findByTenantIdAndUniqueName(UUID tenantId, String uniqueName);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select t from WhatsAppTenantTemplate t where t.tenantId = :tenantId and t.uniqueName = :uniqueName")
  Optional<WhatsAppTenantTemplate> lockByTenantIdAndUniqueName(
      @Param("tenantId") UUID tenantId, @Param("uniqueName") String uniqueName);
}
