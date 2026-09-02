package com.nammamedmate.server.application.notification;

import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.DeliveryChannel;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.NotificationDelivery;
import com.nammamedmate.server.domain.NotificationEvent;
import com.nammamedmate.server.domain.NotificationSource;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.RouteSpec;
import com.nammamedmate.server.domain.RoutingRole;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRoleAssignmentRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationRoutingService {

  private final NotificationEventRepository eventRepository;
  private final NotificationDeliveryRepository deliveryRepository;
  private final NotificationRoleAssignmentRepository assignmentRepository;
  private final AppUserRepository appUserRepository;
  private final LocationRepository locationRepository;
  private final NotificationSourceRepository sourceRepository;
  private final NotificationRecorder recorder;
  private final Clock clock;

  public NotificationRoutingService(
      NotificationEventRepository eventRepository,
      NotificationDeliveryRepository deliveryRepository,
      NotificationRoleAssignmentRepository assignmentRepository,
      AppUserRepository appUserRepository,
      LocationRepository locationRepository,
      NotificationSourceRepository sourceRepository,
      NotificationRecorder recorder,
      Clock clock) {
    this.eventRepository = eventRepository;
    this.deliveryRepository = deliveryRepository;
    this.assignmentRepository = assignmentRepository;
    this.appUserRepository = appUserRepository;
    this.locationRepository = locationRepository;
    this.sourceRepository = sourceRepository;
    this.recorder = recorder;
    this.clock = clock;
  }

  @Transactional
  public RouteResult route(RouteCommand command) {
    validate(command);
    Optional<NotificationEvent> existing = eventRepository.findByEventKey(command.eventKey());
    if (existing.isPresent()) {
      return toResult(existing.get(), true);
    }
    NotificationEvent event;
    try {
      event = persistEvent(command);
    } catch (DataIntegrityViolationException ex) {
      NotificationEvent raced =
          eventRepository.findByEventKey(command.eventKey()).orElseThrow(() -> ex);
      return toResult(raced, true);
    }
    List<RoutedDelivery> deliveries = deliver(command, event);
    return new RouteResult(event.getId(), false, List.copyOf(deliveries));
  }

  private void validate(RouteCommand command) {
    if (command == null
        || command.eventKey() == null
        || command.eventKey().isBlank()
        || command.trigger() == null
        || command.tenantId() == null
        || command.sourceRecordId() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (command.trigger().branchRequired() && command.branchId() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (command.branchId() != null
        && locationRepository
            .findByIdAndTenantIdAndDeletedAtIsNull(command.branchId(), command.tenantId())
            .isEmpty()) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_NOT_IN_TENANT", "Branch is not in this tenant");
    }
    if (command.trigger() == NotificationTrigger.CREDIT_DUE && command.customerId() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if ((command.trigger() == NotificationTrigger.STAFF_LICENSE
            || command.trigger() == NotificationTrigger.ACCOUNT_CREATED)
        && command.affectedUserId() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    if (command.trigger() == NotificationTrigger.APPROVAL_REQUESTED) {
      if (command.approverRole() == null || !approverAllowed(command.approverRole())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
      if ((command.approverRole() == RoutingRole.INVENTORY
              || command.approverRole() == RoutingRole.PHARMACIST)
          && command.branchId() == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
      }
    }
  }

  private static boolean approverAllowed(RoutingRole role) {
    return role == RoutingRole.OWNER
        || role == RoutingRole.MASTER
        || role == RoutingRole.INVENTORY
        || role == RoutingRole.PHARMACIST
        || role == RoutingRole.ACCOUNTANT
        || role == RoutingRole.APPROVER;
  }

  private NotificationEvent persistEvent(RouteCommand command) {
    NotificationEvent event = new NotificationEvent();
    event.setId(UUID.randomUUID());
    event.setEventKey(command.eventKey().trim());
    event.setTrigger(command.trigger());
    event.setTenantId(command.tenantId());
    event.setBranchId(command.branchId());
    event.setSourceRecordId(command.sourceRecordId());
    event.setAffectedUserId(command.affectedUserId());
    event.setApproverRole(command.approverRole());
    event.setCustomerId(command.customerId());
    event.setCreatedAt(Instant.now(clock));
    return eventRepository.saveAndFlush(event);
  }

  private List<RoutedDelivery> deliver(RouteCommand command, NotificationEvent event) {
    NotificationRoutingCopy.Content copy = NotificationRoutingCopy.content(command.trigger());
    Map<String, ResolvedRecipient> unique = new LinkedHashMap<>();
    for (RouteSpec spec : specsFor(command)) {
      for (ResolvedRecipient recipient : resolve(command, spec)) {
        unique.putIfAbsent(recipient.recipientKey() + "|" + spec.channel(), recipient);
      }
    }
    NotificationSource staffSource = null;
    NotificationSource masterSource = null;
    List<RoutedDelivery> deliveries = new ArrayList<>();
    Instant now = Instant.now(clock);
    for (ResolvedRecipient recipient : unique.values()) {
      UUID notificationId = null;
      if (recipient.channel() == DeliveryChannel.IN_APP && recipient.user() != null) {
        boolean master = recipient.user().getRole() == AppUserRole.admin_super;
        if (master) {
          if (masterSource == null) {
            masterSource =
                persistSource(null, null, copy.hrefFor(true), command.sourceRecordId(), now);
          }
          notificationId =
              recordInbox(
                  recipient.user().getId(),
                  null,
                  null,
                  copy.titleFor(true),
                  copy.bodyFor(true),
                  copy.sourceType(),
                  masterSource);
        } else {
          if (staffSource == null) {
            staffSource =
                persistSource(
                    command.tenantId(),
                    command.branchId(),
                    copy.hrefFor(false),
                    command.sourceRecordId(),
                    now);
          }
          notificationId =
              recordInbox(
                  recipient.user().getId(),
                  command.tenantId(),
                  command.branchId(),
                  copy.titleFor(false),
                  copy.bodyFor(false),
                  copy.sourceType(),
                  staffSource);
        }
      }
      NotificationDelivery delivery = new NotificationDelivery();
      delivery.setId(UUID.randomUUID());
      delivery.setEventId(event.getId());
      delivery.setRecipientKey(recipient.recipientKey());
      delivery.setChannel(recipient.channel());
      delivery.setRecipientUserId(recipient.user() == null ? null : recipient.user().getId());
      delivery.setNotificationId(notificationId);
      delivery.setCreatedAt(now);
      deliveryRepository.save(delivery);
      deliveries.add(
          new RoutedDelivery(
              recipient.recipientKey(),
              recipient.channel(),
              recipient.user() == null ? null : recipient.user().getId(),
              notificationId));
    }
    return deliveries;
  }

  private List<RouteSpec> specsFor(RouteCommand command) {
    if (command.trigger() == NotificationTrigger.APPROVAL_REQUESTED) {
      return List.of(new RouteSpec(command.approverRole(), DeliveryChannel.IN_APP));
    }
    return command.trigger().specs();
  }

  private List<ResolvedRecipient> resolve(RouteCommand command, RouteSpec spec) {
    return switch (spec.role()) {
      case OWNER ->
          appUserRepository
              .findActiveByTenantIdAndRole(command.tenantId(), AppUserRole.pharmacy_owner)
              .stream()
              .map(user -> staff(user, spec.channel()))
              .toList();
      case MASTER ->
          appUserRepository.findActiveMasters().stream()
              .map(user -> staff(user, spec.channel()))
              .toList();
      case INVENTORY, PHARMACIST -> {
        if (command.branchId() == null) {
          yield List.of();
        }
        yield assignmentRepository
            .findActiveUsersAtBranch(command.tenantId(), command.branchId(), spec.role())
            .stream()
            .map(user -> staff(user, spec.channel()))
            .toList();
      }
      case ACCOUNTANT, APPROVER ->
          assignmentRepository.findActiveUsersInTenant(command.tenantId(), spec.role()).stream()
              .map(user -> staff(user, spec.channel()))
              .toList();
      case AFFECTED_STAFF -> inAppIfActive(loadScopedUser(command), spec.channel());
      case NEW_USER -> resolveNewUser(command, spec.channel());
      case CUSTOMER ->
          List.of(new ResolvedRecipient("customer:" + command.customerId(), spec.channel(), null));
    };
  }

  private List<ResolvedRecipient> resolveNewUser(RouteCommand command, DeliveryChannel channel) {
    Optional<AppUser> found = loadScopedUser(command);
    if (found.isEmpty()) {
      return List.of();
    }
    AppUser user = found.get();
    if (channel == DeliveryChannel.IN_APP && !isActive(user)) {
      return List.of();
    }
    if (channel == DeliveryChannel.CREDENTIAL && user.getDeletedAt() != null) {
      return List.of();
    }
    return List.of(staff(user, channel));
  }

  private List<ResolvedRecipient> inAppIfActive(Optional<AppUser> found, DeliveryChannel channel) {
    if (found.isEmpty() || !isActive(found.get())) {
      return List.of();
    }
    return List.of(staff(found.get(), channel));
  }

  private Optional<AppUser> loadScopedUser(RouteCommand command) {
    if (command.affectedUserId() == null) {
      return Optional.empty();
    }
    return appUserRepository
        .findById(command.affectedUserId())
        .filter(user -> user.getDeletedAt() == null)
        .filter(
            user -> user.getTenantId() == null || user.getTenantId().equals(command.tenantId()));
  }

  private static boolean isActive(AppUser user) {
    return user.isActive()
        && user.getStatus() == UserAccountStatus.ACTIVE
        && user.getDeletedAt() == null;
  }

  private static ResolvedRecipient staff(AppUser user, DeliveryChannel channel) {
    return new ResolvedRecipient("user:" + user.getId(), channel, user);
  }

  private NotificationSource persistSource(
      UUID tenantId, UUID branchId, String href, UUID sourceRecordId, Instant now) {
    NotificationSource source = new NotificationSource();
    source.setId(UUID.randomUUID());
    source.setTenantId(tenantId);
    source.setBranchId(branchId);
    source.setHref(href);
    source.setSourceRecordId(sourceRecordId);
    source.setCreatedAt(now);
    return sourceRepository.save(source);
  }

  private UUID recordInbox(
      UUID recipientUserId,
      UUID tenantId,
      UUID branchId,
      String title,
      String body,
      String sourceType,
      NotificationSource source) {
    Notification saved =
        recorder.record(
            new NotificationDraft(
                recipientUserId,
                tenantId,
                branchId,
                title,
                body,
                sourceType,
                source.getId(),
                source.getHref()));
    return saved.getId();
  }

  private RouteResult toResult(NotificationEvent event, boolean alreadyRouted) {
    List<RoutedDelivery> deliveries =
        deliveryRepository.findByEventIdOrderByCreatedAtAsc(event.getId()).stream()
            .map(
                row ->
                    new RoutedDelivery(
                        row.getRecipientKey(),
                        row.getChannel(),
                        row.getRecipientUserId(),
                        row.getNotificationId()))
            .toList();
    return new RouteResult(event.getId(), alreadyRouted, deliveries);
  }

  private record ResolvedRecipient(String recipientKey, DeliveryChannel channel, AppUser user) {}
}
