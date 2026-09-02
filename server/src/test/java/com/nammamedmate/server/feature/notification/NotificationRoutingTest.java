package com.nammamedmate.server.feature.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.application.notification.NotificationRoutingService;
import com.nammamedmate.server.application.notification.RouteCommand;
import com.nammamedmate.server.application.notification.RouteResult;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.DeliveryChannel;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.NotificationRoleAssignment;
import com.nammamedmate.server.domain.NotificationSource;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.RoutingRole;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationRoleAssignmentRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class NotificationRoutingTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-01T08:00:00Z");

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
  @Autowired private NotificationRoutingService routingService;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository eventRepository;
  @Autowired private NotificationDeliveryRepository deliveryRepository;
  @Autowired private NotificationRoleAssignmentRepository assignmentRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    deliveryRepository.deleteAll();
    eventRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    assignmentRepository.deleteAll();
    userSessionRepository.deleteAll();
    appUserRepository.deleteAll();
    locationRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_lowStockRoutesToBranchInventoryAndOwner() {
    Fixture fx = fixture();
    assign(fx.inventory, fx.tenant.getId(), fx.sending.getId(), RoutingRole.INVENTORY);
    assign(fx.receivingInv, fx.tenant.getId(), fx.receiving.getId(), RoutingRole.INVENTORY);

    RouteResult result =
        routingService.route(
            branchEvent("low-1", NotificationTrigger.LOW_STOCK, fx, fx.sending.getId()));

    assertThat(inboxUserIds()).containsExactlyInAnyOrder(fx.owner.getId(), fx.inventory.getId());
    assertThat(inboxUserIds()).doesNotContain(fx.receivingInv.getId(), fx.pharmacist.getId());
    assertThat(sourceTypes()).containsOnly("low_stock");
    assertThat(hrefs()).containsOnly("/inventory");
    assertThat(result.alreadyRouted()).isFalse();
  }

  @Test
  void ac01_expiryRoutesToInventoryAndPharmacistNotOwner() {
    Fixture fx = fixture();
    assign(fx.inventory, fx.tenant.getId(), fx.sending.getId(), RoutingRole.INVENTORY);
    assign(fx.pharmacist, fx.tenant.getId(), fx.sending.getId(), RoutingRole.PHARMACIST);

    routingService.route(
        branchEvent("exp-1", NotificationTrigger.ITEM_EXPIRY, fx, fx.sending.getId()));

    assertThat(inboxUserIds())
        .containsExactlyInAnyOrder(fx.inventory.getId(), fx.pharmacist.getId());
    assertThat(inboxUserIds()).doesNotContain(fx.owner.getId());
    assertThat(sourceTypes()).containsOnly("item_expiry");
  }

  @Test
  void ac01_pullTransferUsesSendingBranchOnly() {
    Fixture fx = fixture();
    assign(fx.inventory, fx.tenant.getId(), fx.sending.getId(), RoutingRole.INVENTORY);
    assign(fx.receivingInv, fx.tenant.getId(), fx.receiving.getId(), RoutingRole.INVENTORY);

    routingService.route(
        branchEvent("xfer-req", NotificationTrigger.TRANSFER_REQUESTED, fx, fx.sending.getId()));

    assertThat(inboxUserIds()).contains(fx.owner.getId(), fx.inventory.getId());
    assertThat(inboxUserIds()).doesNotContain(fx.receivingInv.getId());
  }

  @Test
  void ac01_transferReceiptUsesReceivingBranchOnly() {
    Fixture fx = fixture();
    assign(fx.inventory, fx.tenant.getId(), fx.sending.getId(), RoutingRole.INVENTORY);
    assign(fx.receivingInv, fx.tenant.getId(), fx.receiving.getId(), RoutingRole.INVENTORY);

    routingService.route(
        branchEvent("xfer-rcv", NotificationTrigger.TRANSFER_RECEIPT, fx, fx.receiving.getId()));

    assertThat(inboxUserIds()).contains(fx.owner.getId(), fx.receivingInv.getId());
    assertThat(inboxUserIds()).doesNotContain(fx.inventory.getId());
  }

  @Test
  void ac01_approvalRoutesToConfiguredApprover() {
    Fixture fx = fixture();
    assign(fx.accountant, fx.tenant.getId(), null, RoutingRole.ACCOUNTANT);

    routingService.route(
        new RouteCommand(
            "appr-1",
            NotificationTrigger.APPROVAL_REQUESTED,
            fx.tenant.getId(),
            null,
            UUID.randomUUID(),
            null,
            RoutingRole.ACCOUNTANT,
            null));

    assertThat(inboxUserIds()).containsExactly(fx.accountant.getId());
    assertThat(sourceTypes()).containsOnly("approval");
  }

  @Test
  void ac01_supplierDueRoutesToAccountantAndOwner() {
    Fixture fx = fixture();
    assign(fx.accountant, fx.tenant.getId(), null, RoutingRole.ACCOUNTANT);

    routingService.route(tenantEvent("sup-1", NotificationTrigger.SUPPLIER_DUE, fx));

    assertThat(inboxUserIds()).containsExactlyInAnyOrder(fx.owner.getId(), fx.accountant.getId());
    assertThat(hrefs()).containsOnly("/purchases");
  }

  @Test
  void ac01_licenseExpiryNotifiesOwnerAndMasterWithDistinctHrefs() {
    Fixture fx = fixture();

    routingService.route(tenantEvent("lic-1", NotificationTrigger.LICENSE_EXPIRY, fx));

    assertThat(inboxUserIds()).containsExactlyInAnyOrder(fx.owner.getId(), fx.master.getId());
    Notification ownerNote = notificationFor(fx.owner.getId());
    Notification masterNote = notificationFor(fx.master.getId());
    assertThat(ownerNote.getHref()).isEqualTo("/subscription");
    assertThat(ownerNote.getTenantId()).isEqualTo(fx.tenant.getId());
    assertThat(masterNote.getHref()).isEqualTo("/pharmacies");
    assertThat(masterNote.getTenantId()).isNull();
  }

  @Test
  void ac01_staffLicenseNotifiesOwnerAndAffectedStaff() {
    Fixture fx = fixture();

    routingService.route(
        new RouteCommand(
            "staff-lic",
            NotificationTrigger.STAFF_LICENSE,
            fx.tenant.getId(),
            null,
            UUID.randomUUID(),
            fx.pharmacist.getId(),
            null,
            null));

    assertThat(inboxUserIds()).containsExactlyInAnyOrder(fx.owner.getId(), fx.pharmacist.getId());
  }

  @Test
  void ac01_creditDueNotifiesStaffAndRecordsWhatsAppNotSms() {
    Fixture fx = fixture();
    assign(fx.accountant, fx.tenant.getId(), null, RoutingRole.ACCOUNTANT);
    UUID customerId = UUID.randomUUID();

    RouteResult result =
        routingService.route(
            new RouteCommand(
                "credit-1",
                NotificationTrigger.CREDIT_DUE,
                fx.tenant.getId(),
                null,
                UUID.randomUUID(),
                null,
                null,
                customerId));

    assertThat(inboxUserIds()).containsExactlyInAnyOrder(fx.owner.getId(), fx.accountant.getId());
    assertThat(result.deliveries())
        .filteredOn(d -> d.channel() == DeliveryChannel.WHATSAPP)
        .extracting(d -> d.recipientKey())
        .containsExactly("customer:" + customerId);
    assertThat(result.deliveries()).noneMatch(d -> d.channel() == DeliveryChannel.CREDENTIAL);
    assertThat(hrefs()).containsOnly("/credit");
  }

  @Test
  void ac01_newUserRecordsCredentialAndInAppWhenActive() {
    Fixture fx = fixture();

    RouteResult result =
        routingService.route(
            new RouteCommand(
                "acct-1",
                NotificationTrigger.ACCOUNT_CREATED,
                fx.tenant.getId(),
                null,
                UUID.randomUUID(),
                fx.pharmacist.getId(),
                null,
                null));

    assertThat(result.deliveries())
        .extracting(d -> d.channel())
        .containsExactlyInAnyOrder(DeliveryChannel.CREDENTIAL, DeliveryChannel.IN_APP);
    assertThat(inboxUserIds()).containsExactly(fx.pharmacist.getId());
  }

  @Test
  void ac01_kycAndPlanLimitRouteToOwner() {
    Fixture fx = fixture();
    routingService.route(tenantEvent("kyc-1", NotificationTrigger.KYC, fx));
    assertThat(inboxUserIds()).containsExactly(fx.owner.getId());
    assertThat(hrefs()).containsOnly("/account");

    deliveryRepository.deleteAll();
    eventRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();

    routingService.route(tenantEvent("plan-1", NotificationTrigger.PLAN_LIMIT, fx));
    assertThat(inboxUserIds()).containsExactly(fx.owner.getId());
    assertThat(hrefs()).containsOnly("/subscription");
  }

  @Test
  void ac01_subscriptionExpiryNotifiesOwnerAndMaster() throws Exception {
    Fixture fx = fixture();

    routingService.route(tenantEvent("sub-1", NotificationTrigger.SUBSCRIPTION_EXPIRY, fx));

    Notification ownerNote = notificationFor(fx.owner.getId());
    Notification masterNote = notificationFor(fx.master.getId());
    assertThat(ownerNote.getHref()).isEqualTo("/subscription");
    assertThat(masterNote.getHref()).isEqualTo("/subscriptions");
    assertThat(ownerNote.getSourceType()).isEqualTo("subscription_expiry");

    Cookie cookie = login("master@hq.local");
    mockMvc
        .perform(get("/api/v1/notifications").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].sourceType").value("subscription_expiry"));
    mockMvc
        .perform(post("/api/v1/notifications/" + masterNote.getId() + "/open").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.href").value("/subscriptions"));
  }

  @Test
  void ac02_recipientsResolvedAtEventTimeFromActiveRoles() {
    Fixture fx = fixture();
    assign(fx.inventory, fx.tenant.getId(), fx.sending.getId(), RoutingRole.INVENTORY);

    routingService.route(
        branchEvent("low-live", NotificationTrigger.LOW_STOCK, fx, fx.sending.getId()));
    assertThat(inboxUserIds()).contains(fx.inventory.getId());

    assignmentRepository.deleteAll();
    deliveryRepository.deleteAll();
    eventRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationSourceRepository.deleteAll();

    routingService.route(
        branchEvent("low-after", NotificationTrigger.LOW_STOCK, fx, fx.sending.getId()));
    assertThat(inboxUserIds()).containsExactly(fx.owner.getId());
  }

  @Test
  void ac03_retrySameEventKeyIsIdempotent() {
    Fixture fx = fixture();
    RouteCommand command = tenantEvent("kyc-dup", NotificationTrigger.KYC, fx);

    RouteResult first = routingService.route(command);
    RouteResult second = routingService.route(command);

    assertThat(second.alreadyRouted()).isTrue();
    assertThat(second.eventId()).isEqualTo(first.eventId());
    assertThat(notificationRepository.count()).isEqualTo(1);
    assertThat(deliveryRepository.count()).isEqualTo(1);
    assertThat(eventRepository.count()).isEqualTo(1);
  }

  @Test
  void ac04_retainsSourceRecordAndTenantBranch() {
    Fixture fx = fixture();
    UUID sourceRecord = UUID.randomUUID();
    RouteCommand command =
        new RouteCommand(
            "low-ctx",
            NotificationTrigger.LOW_STOCK,
            fx.tenant.getId(),
            fx.sending.getId(),
            sourceRecord,
            null,
            null,
            null);
    assign(fx.inventory, fx.tenant.getId(), fx.sending.getId(), RoutingRole.INVENTORY);

    RouteResult result = routingService.route(command);

    assertThat(eventRepository.findById(result.eventId()).orElseThrow().getSourceRecordId())
        .isEqualTo(sourceRecord);
    assertThat(eventRepository.findById(result.eventId()).orElseThrow().getTenantId())
        .isEqualTo(fx.tenant.getId());
    assertThat(eventRepository.findById(result.eventId()).orElseThrow().getBranchId())
        .isEqualTo(fx.sending.getId());
    Notification inbox = notificationFor(fx.owner.getId());
    assertThat(inbox.getTenantId()).isEqualTo(fx.tenant.getId());
    assertThat(inbox.getBranchId()).isEqualTo(fx.sending.getId());
    NotificationSource source =
        notificationSourceRepository.findById(inbox.getSourceId()).orElseThrow();
    assertThat(source.getSourceRecordId()).isEqualTo(sourceRecord);
    assertThat(source.getTenantId()).isEqualTo(fx.tenant.getId());
    assertThat(source.getBranchId()).isEqualTo(fx.sending.getId());
  }

  @Test
  void ac05_crossTenantOwnerIsNotNotified() {
    Fixture fx = fixture();
    Tenant other = persistTenant("other-pharma");
    persistUser(other.getId(), "other@iso.local", AppUserRole.pharmacy_owner);

    routingService.route(tenantEvent("kyc-iso", NotificationTrigger.KYC, fx));

    assertThat(inboxUserIds()).containsExactly(fx.owner.getId());
  }

  @Test
  void ac05_inactiveUserAndRemovedRoleAreSkipped() {
    Fixture fx = fixture();
    fx.pharmacist.setStatus(UserAccountStatus.SUSPENDED);
    appUserRepository.saveAndFlush(fx.pharmacist);

    routingService.route(
        new RouteCommand(
            "staff-inactive",
            NotificationTrigger.STAFF_LICENSE,
            fx.tenant.getId(),
            null,
            UUID.randomUUID(),
            fx.pharmacist.getId(),
            null,
            null));

    assertThat(inboxUserIds()).containsExactly(fx.owner.getId());
  }

  @Test
  void ac05_retryAfterSourceDeletedDoesNotDuplicate() {
    Fixture fx = fixture();
    RouteCommand command = tenantEvent("kyc-del", NotificationTrigger.KYC, fx);
    routingService.route(command);
    NotificationSource source = notificationSourceRepository.findAll().get(0);
    source.setDeletedAt(T0);
    notificationSourceRepository.saveAndFlush(source);

    routingService.route(command);

    assertThat(notificationRepository.count()).isEqualTo(1);
    assertThat(eventRepository.count()).isEqualTo(1);
  }

  @Test
  void ac05_newUserInactiveGetsCredentialOnly() {
    Fixture fx = fixture();
    fx.pharmacist.setActive(false);
    appUserRepository.saveAndFlush(fx.pharmacist);

    RouteResult result =
        routingService.route(
            new RouteCommand(
                "acct-inactive",
                NotificationTrigger.ACCOUNT_CREATED,
                fx.tenant.getId(),
                null,
                UUID.randomUUID(),
                fx.pharmacist.getId(),
                null,
                null));

    assertThat(result.deliveries())
        .extracting(d -> d.channel())
        .containsExactly(DeliveryChannel.CREDENTIAL);
    assertThat(notificationRepository.count()).isZero();
  }

  @Test
  void ac05_ownerOpenKeepsStaffHref() throws Exception {
    Fixture fx = fixture();
    routingService.route(tenantEvent("plan-open", NotificationTrigger.PLAN_LIMIT, fx));
    Notification ownerNote = notificationFor(fx.owner.getId());
    Cookie cookie = login("owner@alerts.local");
    mockMvc
        .perform(post("/api/v1/notifications/" + ownerNote.getId() + "/open").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.href").value("/subscription"))
        .andExpect(jsonPath("$.data.sourceType").value("plan_limit"));
  }

  private List<UUID> inboxUserIds() {
    return notificationRepository.findAll().stream().map(Notification::getRecipientUserId).toList();
  }

  private List<String> sourceTypes() {
    return notificationRepository.findAll().stream().map(Notification::getSourceType).toList();
  }

  private List<String> hrefs() {
    return notificationRepository.findAll().stream().map(Notification::getHref).distinct().toList();
  }

  private Notification notificationFor(UUID userId) {
    return notificationRepository.findAll().stream()
        .filter(n -> n.getRecipientUserId().equals(userId))
        .findFirst()
        .orElseThrow();
  }

  private RouteCommand tenantEvent(String key, NotificationTrigger trigger, Fixture fx) {
    return new RouteCommand(
        key, trigger, fx.tenant.getId(), null, UUID.randomUUID(), null, null, null);
  }

  private RouteCommand branchEvent(
      String key, NotificationTrigger trigger, Fixture fx, UUID branchId) {
    return new RouteCommand(
        key, trigger, fx.tenant.getId(), branchId, UUID.randomUUID(), null, null, null);
  }

  private Fixture fixture() {
    Tenant tenant = persistTenant("alerts-pharma");
    Location sending = persistBranch(tenant.getId(), "Sending");
    Location receiving = persistBranch(tenant.getId(), "Receiving");
    AppUser owner = persistUser(tenant.getId(), "owner@alerts.local", AppUserRole.pharmacy_owner);
    AppUser inventory = persistUser(tenant.getId(), "inv@alerts.local", AppUserRole.pharmacy_staff);
    AppUser receivingInv =
        persistUser(tenant.getId(), "inv-b@alerts.local", AppUserRole.pharmacy_staff);
    AppUser pharmacist = persistUser(tenant.getId(), "rx@alerts.local", AppUserRole.pharmacy_staff);
    AppUser accountant = persistUser(tenant.getId(), "ca@alerts.local", AppUserRole.pharmacy_staff);
    AppUser master = persistUser(null, "master@hq.local", AppUserRole.admin_super);
    return new Fixture(
        tenant, sending, receiving, owner, inventory, receivingInv, pharmacist, accountant, master);
  }

  private void assign(AppUser user, UUID tenantId, UUID branchId, RoutingRole role) {
    NotificationRoleAssignment assignment = new NotificationRoleAssignment();
    assignment.setId(UUID.randomUUID());
    assignment.setUserId(user.getId());
    assignment.setTenantId(tenantId);
    assignment.setBranchId(branchId);
    assignment.setRoutingRole(role);
    assignment.setCreatedAt(T0);
    assignmentRepository.saveAndFlush(assignment);
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

  private record Fixture(
      Tenant tenant,
      Location sending,
      Location receiving,
      AppUser owner,
      AppUser inventory,
      AppUser receivingInv,
      AppUser pharmacist,
      AppUser accountant,
      AppUser master) {}
}
