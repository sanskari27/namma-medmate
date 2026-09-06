package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.WhatsAppMessage;
import com.nammamedmate.server.domain.WhatsAppMessageKind;
import com.nammamedmate.server.domain.WhatsAppMessageStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WhatsAppMessageRepository extends JpaRepository<WhatsAppMessage, UUID> {

  Optional<WhatsAppMessage> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<WhatsAppMessage> findByTenantIdAndIdempotencyKey(UUID tenantId, String idempotencyKey);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select m from WhatsAppMessage m
      where m.tenantId = :tenantId and m.idempotencyKey = :idempotencyKey
      """)
  Optional<WhatsAppMessage> lockByTenantIdAndIdempotencyKey(
      @Param("tenantId") UUID tenantId, @Param("idempotencyKey") String idempotencyKey);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select m from WhatsAppMessage m where m.id = :id and m.tenantId = :tenantId")
  Optional<WhatsAppMessage> lockByIdAndTenantId(
      @Param("id") UUID id, @Param("tenantId") UUID tenantId);

  List<WhatsAppMessage> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);

  List<WhatsAppMessage> findAllByTenantIdAndKindOrderByCreatedAtDesc(
      UUID tenantId, WhatsAppMessageKind kind);

  List<WhatsAppMessage> findAllByTenantIdAndStatusOrderByCreatedAtDesc(
      UUID tenantId, WhatsAppMessageStatus status);

  List<WhatsAppMessage> findAllByTenantIdAndCampaignIdOrderByCreatedAtDesc(
      UUID tenantId, UUID campaignId);

  long countByTenantIdAndCampaignId(UUID tenantId, UUID campaignId);
}
