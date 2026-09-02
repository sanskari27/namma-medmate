package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Notification;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

  @Query(
      """
      select n from Notification n
      where n.recipientUserId = :userId
        and ((:tenantId is null and n.tenantId is null) or n.tenantId = :tenantId)
      order by n.createdAt desc
      """)
  Page<Notification> findInbox(
      @Param("userId") UUID userId, @Param("tenantId") UUID tenantId, Pageable pageable);

  @Query(
      """
      select count(n) from Notification n
      where n.recipientUserId = :userId
        and ((:tenantId is null and n.tenantId is null) or n.tenantId = :tenantId)
        and n.readAt is null
      """)
  long countUnread(@Param("userId") UUID userId, @Param("tenantId") UUID tenantId);

  @Query(
      """
      select n from Notification n
      where n.id = :id
        and n.recipientUserId = :userId
        and ((:tenantId is null and n.tenantId is null) or n.tenantId = :tenantId)
      """)
  Optional<Notification> findOwned(
      @Param("id") UUID id, @Param("userId") UUID userId, @Param("tenantId") UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select n from Notification n
      where n.id = :id
        and n.recipientUserId = :userId
        and ((:tenantId is null and n.tenantId is null) or n.tenantId = :tenantId)
      """)
  Optional<Notification> lockOwned(
      @Param("id") UUID id, @Param("userId") UUID userId, @Param("tenantId") UUID tenantId);
}
