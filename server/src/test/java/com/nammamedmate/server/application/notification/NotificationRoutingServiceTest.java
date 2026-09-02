package com.nammamedmate.server.application.notification;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRoleAssignmentRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class NotificationRoutingServiceTest {

  private static final Instant NOW = Instant.parse("2026-09-02T12:00:00Z");

  @Mock private NotificationEventRepository eventRepository;
  @Mock private NotificationDeliveryRepository deliveryRepository;
  @Mock private NotificationRoleAssignmentRepository assignmentRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private LocationRepository locationRepository;
  @Mock private NotificationSourceRepository sourceRepository;
  @Mock private NotificationRecorder recorder;

  private NotificationRoutingService service;

  @BeforeEach
  void setUp() {
    service =
        new NotificationRoutingService(
            eventRepository,
            deliveryRepository,
            assignmentRepository,
            appUserRepository,
            locationRepository,
            sourceRepository,
            recorder,
            Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void ac05_blankEventKeyIsValidationError() {
    RouteCommand command =
        new RouteCommand(
            "  ",
            NotificationTrigger.PLAN_LIMIT,
            UUID.randomUUID(),
            null,
            UUID.randomUUID(),
            null,
            null,
            null);
    assertThatThrownBy(() -> service.route(command))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus(), ex -> ((ApiException) ex).getCode())
        .containsExactly(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
    verify(eventRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void ac05_lowStockWithoutBranchIsValidationError() {
    RouteCommand command =
        new RouteCommand(
            "low-1",
            NotificationTrigger.LOW_STOCK,
            UUID.randomUUID(),
            null,
            UUID.randomUUID(),
            null,
            null,
            null);
    assertThatThrownBy(() -> service.route(command)).isInstanceOf(ApiException.class);
    verify(recorder, never()).record(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void ac05_creditDueWithoutCustomerIsValidationError() {
    RouteCommand command =
        new RouteCommand(
            "credit-1",
            NotificationTrigger.CREDIT_DUE,
            UUID.randomUUID(),
            null,
            UUID.randomUUID(),
            null,
            null,
            null);
    assertThatThrownBy(() -> service.route(command)).isInstanceOf(ApiException.class);
  }

  @Test
  void ac05_approvalWithoutRoleIsValidationError() {
    RouteCommand command =
        new RouteCommand(
            "appr-1",
            NotificationTrigger.APPROVAL_REQUESTED,
            UUID.randomUUID(),
            null,
            UUID.randomUUID(),
            null,
            null,
            null);
    assertThatThrownBy(() -> service.route(command)).isInstanceOf(ApiException.class);
  }

  @Test
  void ac05_foreignBranchIsUnprocessable() {
    UUID tenantId = UUID.randomUUID();
    UUID branchId = UUID.randomUUID();
    when(locationRepository.findByIdAndTenantIdAndDeletedAtIsNull(branchId, tenantId))
        .thenReturn(Optional.empty());
    RouteCommand command =
        new RouteCommand(
            "low-2",
            NotificationTrigger.LOW_STOCK,
            tenantId,
            branchId,
            UUID.randomUUID(),
            null,
            null,
            null);
    assertThatThrownBy(() -> service.route(command))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus(), ex -> ((ApiException) ex).getCode())
        .containsExactly(HttpStatus.UNPROCESSABLE_ENTITY, "BRANCH_NOT_IN_TENANT");
    verify(recorder, never()).record(org.mockito.ArgumentMatchers.any());
  }
}
