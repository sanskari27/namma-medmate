package com.nammamedmate.server.feature.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.NotificationSource;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class NotificationInboxTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-01T08:00:00Z");
  private static final Instant T1 = Instant.parse("2026-09-01T09:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_test")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    locationRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_listIncludesReadAndUnreadItems() throws Exception {
    Tenant tenant = persistTenant("alerts-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@alerts.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    persistNotification(
        owner.getId(),
        tenant.getId(),
        null,
        source,
        "Low stock on shelf A",
        "Reorder paracetamol 500mg",
        T0,
        T0);
    persistNotification(
        owner.getId(), tenant.getId(), null, source, "Batch near expiry", "Check rack B", null, T1);

    Cookie cookie = login("owner@alerts.local");
    mockMvc
        .perform(get("/api/v1/notifications").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.items.length()").value(2))
        .andExpect(jsonPath("$.data.items[0].title").value("Batch near expiry"))
        .andExpect(jsonPath("$.data.items[0].read").value(false))
        .andExpect(jsonPath("$.data.items[1].title").value("Low stock on shelf A"))
        .andExpect(jsonPath("$.data.items[1].read").value(true))
        .andExpect(jsonPath("$.data.unreadCount").value(1));
  }

  @Test
  void ac01_unreadCountMatchesInbox() throws Exception {
    Tenant tenant = persistTenant("badge-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@badge.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    persistNotification(
        owner.getId(), tenant.getId(), null, source, "Unread one", "body", null, T0);
    persistNotification(
        owner.getId(), tenant.getId(), null, source, "Already seen", "body", T0, T1);

    Cookie cookie = login("owner@badge.local");
    mockMvc
        .perform(get("/api/v1/notifications/unread-count").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.unreadCount").value(1));
  }

  @Test
  void ac02_markReadPersistsAndIsIdempotent() throws Exception {
    Tenant tenant = persistTenant("read-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@read.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    Notification unread =
        persistNotification(
            owner.getId(), tenant.getId(), null, source, "Need reorder", "body", null, T0);

    Cookie cookie = login("owner@read.local");
    mockMvc
        .perform(post("/api/v1/notifications/" + unread.getId() + "/read").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.read").value(true));

    Instant firstReadAt = notificationRepository.findById(unread.getId()).orElseThrow().getReadAt();
    assertThat(firstReadAt).isNotNull();

    mockMvc
        .perform(post("/api/v1/notifications/" + unread.getId() + "/read").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.read").value(true));

    Instant secondReadAt =
        notificationRepository.findById(unread.getId()).orElseThrow().getReadAt();
    assertThat(secondReadAt).isEqualTo(firstReadAt);
  }

  @Test
  void ac03_openReturnsHrefWhenCurrentlyAuthorized() throws Exception {
    Tenant tenant = persistTenant("open-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@open.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    Notification unread =
        persistNotification(
            owner.getId(), tenant.getId(), null, source, "Stock alert", "body", null, T0);

    Cookie cookie = login("owner@open.local");
    mockMvc
        .perform(post("/api/v1/notifications/" + unread.getId() + "/open").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.href").value("/inventory"))
        .andExpect(jsonPath("$.data.sourceType").value("stock_item"))
        .andExpect(jsonPath("$.data.sourceId").value(source.getId().toString()));

    assertThat(notificationRepository.findById(unread.getId()).orElseThrow().getReadAt())
        .isNotNull();
  }

  @Test
  void ac03_openDeletedSourceDoesNotMarkRead() throws Exception {
    Tenant tenant = persistTenant("gone-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@gone.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    source.setDeletedAt(T1);
    notificationSourceRepository.saveAndFlush(source);
    Notification unread =
        persistNotification(
            owner.getId(), tenant.getId(), null, source, "Deleted rack", "body", null, T0);

    Cookie cookie = login("owner@gone.local");
    mockMvc
        .perform(post("/api/v1/notifications/" + unread.getId() + "/open").cookie(cookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.code").value("SOURCE_DELETED"));

    assertThat(notificationRepository.findById(unread.getId()).orElseThrow().getReadAt()).isNull();
  }

  @Test
  void ac03_openRevokedSourceIsDenied() throws Exception {
    Tenant tenant = persistTenant("deny-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@deny.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    source.setAccessRevokedAt(T1);
    notificationSourceRepository.saveAndFlush(source);
    Notification unread =
        persistNotification(
            owner.getId(), tenant.getId(), null, source, "No longer allowed", "body", null, T0);

    Cookie cookie = login("owner@deny.local");
    mockMvc
        .perform(post("/api/v1/notifications/" + unread.getId() + "/open").cookie(cookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("SOURCE_DENIED"));
    assertThat(notificationRepository.findById(unread.getId()).orElseThrow().getReadAt()).isNull();
  }

  @Test
  void ac03_openRelocatedSourceConflicts() throws Exception {
    Tenant tenant = persistTenant("move-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@move.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/racks");
    Notification unread =
        persistNotification(
            owner.getId(), tenant.getId(), null, source, "Moved record", "body", null, T0);

    Cookie cookie = login("owner@move.local");
    mockMvc
        .perform(post("/api/v1/notifications/" + unread.getId() + "/open").cookie(cookie))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("SOURCE_CONFLICT"));
    assertThat(notificationRepository.findById(unread.getId()).orElseThrow().getReadAt()).isNull();
  }

  @Test
  void ac04_preferencesEndpointIsAbsent() throws Exception {
    Tenant tenant = persistTenant("pref-pharma");
    persistOwner(tenant.getId(), "owner@pref.local");
    Cookie cookie = login("owner@pref.local");
    mockMvc
        .perform(get("/api/v1/notifications/preferences").cookie(cookie))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            post("/api/v1/notifications/preferences")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac05_unauthenticatedIsUnauthorized() throws Exception {
    mockMvc.perform(get("/api/v1/notifications")).andExpect(status().isUnauthorized());
  }

  @Test
  void ac05_otherRecipientCannotInferNotification() throws Exception {
    Tenant tenant = persistTenant("iso-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@iso.local");
    AppUser staff = persistUser(tenant.getId(), "staff@iso.local", AppUserRole.pharmacy_staff);
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    Notification ownerOnly =
        persistNotification(
            owner.getId(), tenant.getId(), null, source, "Owner only", "body", null, T0);

    Cookie staffCookie = login("staff@iso.local");
    MvcResult missing =
        mockMvc
            .perform(
                post("/api/v1/notifications/" + UUID.randomUUID() + "/read").cookie(staffCookie))
            .andExpect(status().isNotFound())
            .andReturn();
    MvcResult foreign =
        mockMvc
            .perform(
                post("/api/v1/notifications/" + ownerOnly.getId() + "/read").cookie(staffCookie))
            .andExpect(status().isNotFound())
            .andReturn();

    JsonNode missingBody = objectMapper.readTree(missing.getResponse().getContentAsString());
    JsonNode foreignBody = objectMapper.readTree(foreign.getResponse().getContentAsString());
    assertThat(foreignBody.path("code").asText()).isEqualTo(missingBody.path("code").asText());
    assertThat(foreignBody.path("message").asText())
        .isEqualTo(missingBody.path("message").asText());
    assertThat(notificationRepository.findById(ownerOnly.getId()).orElseThrow().getReadAt())
        .isNull();
  }

  @Test
  void ac05_crossTenantListDoesNotLeak() throws Exception {
    Tenant tenantA = persistTenant("a-pharma");
    Tenant tenantB = persistTenant("b-pharma");
    AppUser ownerA = persistOwner(tenantA.getId(), "a@iso.local");
    persistOwner(tenantB.getId(), "b@iso.local");
    NotificationSource sourceA = persistSource(tenantA.getId(), null, "/inventory");
    persistNotification(
        ownerA.getId(), tenantA.getId(), null, sourceA, "Tenant A stock", "body", null, T0);

    Cookie cookieB = login("b@iso.local");
    mockMvc
        .perform(get("/api/v1/notifications").cookie(cookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(0))
        .andExpect(jsonPath("$.data.unreadCount").value(0));
  }

  @Test
  void ac05_branchOwnedOpenRequiresMatchingBranch() throws Exception {
    Tenant tenant = persistTenant("branch-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@branch.local");
    Location branchA = persistBranch(tenant.getId(), "Counter A");
    Location branchB = persistBranch(tenant.getId(), "Counter B");
    NotificationSource sourceA = persistSource(tenant.getId(), branchA.getId(), "/inventory");
    Notification mismatched =
        persistNotification(
            owner.getId(),
            tenant.getId(),
            branchB.getId(),
            sourceA,
            "Wrong counter",
            "body",
            null,
            T0);

    Cookie cookie = login("owner@branch.local");
    mockMvc
        .perform(post("/api/v1/notifications/" + mismatched.getId() + "/open").cookie(cookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("SOURCE_DELETED"));
  }

  @Test
  void ac05_invalidPageIsBadRequest() throws Exception {
    Tenant tenant = persistTenant("page-pharma");
    persistOwner(tenant.getId(), "owner@page.local");
    Cookie cookie = login("owner@page.local");
    mockMvc
        .perform(get("/api/v1/notifications").param("page", "-1").cookie(cookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void ac05_invalidIdIsBadRequest() throws Exception {
    Tenant tenant = persistTenant("uuid-pharma");
    persistOwner(tenant.getId(), "owner@uuid.local");
    Cookie cookie = login("owner@uuid.local");
    mockMvc
        .perform(post("/api/v1/notifications/not-a-uuid/read").cookie(cookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void ac01_paginatesNewestFirst() throws Exception {
    Tenant tenant = persistTenant("page2-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@page2.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    persistNotification(owner.getId(), tenant.getId(), null, source, "Older", "body", null, T0);
    persistNotification(owner.getId(), tenant.getId(), null, source, "Newer", "body", null, T1);

    Cookie cookie = login("owner@page2.local");
    mockMvc
        .perform(get("/api/v1/notifications").param("page", "0").param("size", "1").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].title").value("Newer"))
        .andExpect(jsonPath("$.data.page").value(0))
        .andExpect(jsonPath("$.data.size").value(1))
        .andExpect(jsonPath("$.data.totalItems").value(2))
        .andExpect(jsonPath("$.data.totalPages").value(2));
  }

  @Test
  void ac02_concurrentMarkReadDoesNotDuplicate() throws Exception {
    Tenant tenant = persistTenant("race-pharma");
    AppUser owner = persistOwner(tenant.getId(), "owner@race.local");
    NotificationSource source = persistSource(tenant.getId(), null, "/inventory");
    Notification unread =
        persistNotification(owner.getId(), tenant.getId(), null, source, "Race", "body", null, T0);
    Cookie cookie = login("owner@race.local");

    int threads = 8;
    ExecutorService pool = Executors.newFixedThreadPool(threads);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<Integer>> futures = new ArrayList<>();
    try {
      for (int i = 0; i < threads; i++) {
        futures.add(
            pool.submit(
                () -> {
                  start.await(5, TimeUnit.SECONDS);
                  return mockMvc
                      .perform(
                          post("/api/v1/notifications/" + unread.getId() + "/read").cookie(cookie))
                      .andReturn()
                      .getResponse()
                      .getStatus();
                }));
      }
      start.countDown();
      for (Future<Integer> future : futures) {
        assertThat(future.get(10, TimeUnit.SECONDS)).isEqualTo(200);
      }
    } finally {
      pool.shutdownNow();
    }
    assertThat(notificationRepository.findById(unread.getId()).orElseThrow().getReadAt())
        .isNotNull();
  }

  @Test
  void ac01_masterInboxIsPlatformScoped() throws Exception {
    persistUser(null, "master@hq.local", AppUserRole.admin_super);
    Tenant tenant = persistTenant("not-hq");
    AppUser owner = persistOwner(tenant.getId(), "owner@nothq.local");
    NotificationSource pharmacySource = persistSource(tenant.getId(), null, "/inventory");
    persistNotification(
        owner.getId(), tenant.getId(), null, pharmacySource, "Pharmacy only", "body", null, T0);
    NotificationSource hqSource = persistPlatformSource("/kyc");
    AppUser master =
        appUserRepository.findByEmailAndDeletedAtIsNull("master@hq.local").orElseThrow();
    persistNotification(
        master.getId(), null, null, hqSource, "KYC waiting", "Review tenant file", null, T1);

    Cookie cookie = login("master@hq.local");
    mockMvc
        .perform(get("/api/v1/notifications").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].title").value("KYC waiting"));
  }

  private Cookie login(String email) throws Exception {
    Cookie cookie =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }

  private Tenant persistTenant(String slug) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setName(slug);
    tenant.setSlug(slug);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }

  private Location persistBranch(UUID tenantId, String name) {
    Location location = new Location();
    location.setId(UUID.randomUUID());
    location.setTenantId(tenantId);
    location.setName(name);
    location.setCreatedAt(T0);
    location.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(location);
  }

  private AppUser persistOwner(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_owner);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Test " + email);
    user.setRole(role);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
  }

  private NotificationSource persistSource(UUID tenantId, UUID branchId, String href) {
    NotificationSource source = new NotificationSource();
    source.setId(UUID.randomUUID());
    source.setTenantId(tenantId);
    source.setBranchId(branchId);
    source.setHref(href);
    source.setCreatedAt(T0);
    return notificationSourceRepository.saveAndFlush(source);
  }

  private NotificationSource persistPlatformSource(String href) {
    return persistSource(null, null, href);
  }

  private Notification persistNotification(
      UUID recipientUserId,
      UUID tenantId,
      UUID branchId,
      NotificationSource source,
      String title,
      String body,
      Instant readAt,
      Instant createdAt) {
    Notification notification = new Notification();
    notification.setId(UUID.randomUUID());
    notification.setRecipientUserId(recipientUserId);
    notification.setTenantId(tenantId);
    notification.setBranchId(branchId);
    notification.setTitle(title);
    notification.setBody(body);
    notification.setSourceType("stock_item");
    notification.setSourceId(source.getId());
    notification.setHref("/inventory");
    notification.setReadAt(readAt);
    notification.setCreatedAt(createdAt);
    return notificationRepository.saveAndFlush(notification);
  }
}
