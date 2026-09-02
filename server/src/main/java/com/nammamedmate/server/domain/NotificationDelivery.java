package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "notification_delivery")
@Getter
@Setter
public class NotificationDelivery {

  @Id private UUID id;

  @Column(name = "event_id", nullable = false)
  private UUID eventId;

  @Column(name = "recipient_key", nullable = false, length = 80)
  private String recipientKey;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private DeliveryChannel channel;

  @Column(name = "recipient_user_id")
  private UUID recipientUserId;

  @Column(name = "notification_id")
  private UUID notificationId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
