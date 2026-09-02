package com.nammamedmate.server.feature.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.nammamedmate.server.application.notification.NotificationDraft;
import com.nammamedmate.server.application.notification.NotificationRecorder;
import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class NotificationRoutingRollbackTest {

  private static final Instant T0 = Instant.parse("2026-09-01T08:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_rollback")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @MockBean private NotificationRecorder recorder;

  @Autowired private NotificationRoutingService routingService;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private NotificationEventRepository eventRepository;
  @Autowired private NotificationDeliveryRepository deliveryRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    deliveryRepository.deleteAll();
    eventRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac05_failureRollsBackEventAndInbox() {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName("rollback-pharma");
    tenant.setSlug("rollback-pharma");
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    tenantRepository.saveAndFlush(tenant);

    AppUser owner = new AppUser();
    owner.setId(UUID.randomUUID());
    owner.setTenantId(tenant.getId());
    owner.setEmail("owner@rollback.local");
    owner.setPasswordHash(passwordEncoder.encode("counter-pass-1"));
    owner.setDisplayName("Owner");
    owner.setRole(AppUserRole.pharmacy_owner);
    owner.setActive(true);
    owner.setStatus(UserAccountStatus.ACTIVE);
    owner.setCreatedAt(T0);
    owner.setUpdatedAt(T0);
    appUserRepository.saveAndFlush(owner);

    when(recorder.record(any(NotificationDraft.class)))
        .thenThrow(new IllegalStateException("recorder failed"));

    assertThatThrownBy(
            () ->
                routingService.route(
                    new RouteCommand(
                        "kyc-boom",
                        NotificationTrigger.KYC,
                        tenant.getId(),
                        null,
                        UUID.randomUUID(),
                        null,
                        null,
                        null)))
        .isInstanceOf(IllegalStateException.class);

    assertThat(eventRepository.count()).isZero();
    assertThat(deliveryRepository.count()).isZero();
    assertThat(notificationRepository.count()).isZero();
    assertThat(notificationSourceRepository.count()).isZero();
  }
}
