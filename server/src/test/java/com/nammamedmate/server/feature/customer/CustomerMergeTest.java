package com.nammamedmate.server.feature.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.NotificationEvent;
import com.nammamedmate.server.domain.NotificationTrigger;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class CustomerMergeTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T03:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationEventRepository.deleteAll();
    customerRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    accessRoleRepository
        .findByKind(AccessRoleKind.CUSTOM)
        .forEach(
            role -> {
              accessRoleModuleRepository.deleteAll(
                  accessRoleModuleRepository.findByRoleIdIn(java.util.List.of(role.getId())));
              accessRoleRepository.delete(role);
            });
    userSessionRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_survivorAndDuplicateMustBelongToSameTenant() throws Exception {
    Tenant tenantA = persistTenant("merge-a", "Merge A");
    Tenant tenantB = persistTenant("merge-b", "Merge B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@merge.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@merge.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@merge.local");
    Cookie ownerB = login("owner-b@merge.local");

    UUID survivor = createCustomer(ownerA, "Anita", "9001000001");
    UUID foreign = createCustomer(ownerB, "Anita B", "9001000002");

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", survivor, foreign, "{}")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, foreign, "{}")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    assertThat(customerRepository.findById(foreign)).isPresent();
    assertThat(customerRepository.findById(foreign).orElseThrow().getDeletedAt()).isNull();
  }

  @Test
  void ac02_referencesMoveTransactionallyWithoutRewritingImmutableFacts() throws Exception {
    Tenant tenant = persistTenant("merge-refs", "Merge Refs");
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@merge-refs.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@merge-refs.local");

    UUID survivor = createCustomer(cookie, "Ravi", "9002000001");
    UUID duplicate =
        createCustomerFull(
            cookie, "Ravi Kumar", "9002000002", "ravi.dup@example.com", "O+", "Dust", "Asthma");

    Instant survivorCreated = customerRepository.findById(survivor).orElseThrow().getCreatedAt();

    NotificationEvent event = new NotificationEvent();
    event.setId(UUID.randomUUID());
    event.setEventKey("credit-due-" + duplicate);
    event.setTrigger(NotificationTrigger.CREDIT_DUE);
    event.setTenantId(tenant.getId());
    event.setSourceRecordId(UUID.randomUUID());
    event.setCustomerId(duplicate);
    event.setCreatedAt(T0);
    notificationEventRepository.save(event);

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mergeJson(
                        "EXECUTE",
                        survivor,
                        duplicate,
                        """
                        {
                          "name":"DUPLICATE",
                          "phone":"SURVIVOR",
                          "email":"DUPLICATE",
                          "bloodGroup":"DUPLICATE",
                          "allergies":"DUPLICATE",
                          "chronicConditions":"DUPLICATE"
                        }
                        """)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(survivor.toString()))
        .andExpect(jsonPath("$.data.name").value("Ravi Kumar"))
        .andExpect(jsonPath("$.data.phone").value("9002000001"))
        .andExpect(jsonPath("$.data.email").value("ravi.dup@example.com"))
        .andExpect(jsonPath("$.data.bloodGroup").value("O+"))
        .andExpect(jsonPath("$.data.allergies").value("Dust"))
        .andExpect(jsonPath("$.data.chronicConditions").value("Asthma"));

    Customer survivorRow = customerRepository.findById(survivor).orElseThrow();
    assertThat(survivorRow.getCreatedAt()).isEqualTo(survivorCreated);
    assertThat(survivorRow.getDeletedAt()).isNull();

    Customer duplicateRow = customerRepository.findById(duplicate).orElseThrow();
    assertThat(duplicateRow.getDeletedAt()).isNotNull();
    assertThat(duplicateRow.getMergedIntoId()).isEqualTo(survivor);
    assertThat(duplicateRow.getMergedByUserId()).isEqualTo(owner.getId());
    assertThat(duplicateRow.getMergedAt()).isNotNull();

    NotificationEvent moved = notificationEventRepository.findById(event.getId()).orElseThrow();
    assertThat(moved.getCustomerId()).isEqualTo(survivor);
    assertThat(moved.getEventKey()).isEqualTo("credit-due-" + duplicate);
    assertThat(moved.getCreatedAt()).isEqualTo(T0);

    mockMvc
        .perform(get("/api/v1/customers").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(survivor.toString()));
  }

  @Test
  void ac03_conflictsArePreviewedBeforeConfirmation() throws Exception {
    Tenant tenant = persistTenant("merge-prev", "Merge Preview");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@merge-prev.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@merge-prev.local");

    UUID survivor =
        createCustomerFull(
            cookie, "Meera", "9003000001", "meera@a.local", "A+", "Penicillin", null);
    UUID duplicate =
        createCustomerFull(
            cookie, "Meera S", "9003000002", "meera@b.local", "B+", "Sulfa", "Hypertension");

    NotificationEvent event = new NotificationEvent();
    event.setId(UUID.randomUUID());
    event.setEventKey("credit-due-preview-" + duplicate);
    event.setTrigger(NotificationTrigger.CREDIT_DUE);
    event.setTenantId(tenant.getId());
    event.setSourceRecordId(UUID.randomUUID());
    event.setCustomerId(duplicate);
    event.setCreatedAt(T0);
    notificationEventRepository.save(event);

    MvcResult preview =
        mockMvc
            .perform(
                post("/api/v1/customers/merge")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mergeJson("PREVIEW", survivor, duplicate, "{}")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.mode").value("PREVIEW"))
            .andExpect(jsonPath("$.data.survivor.id").value(survivor.toString()))
            .andExpect(jsonPath("$.data.duplicate.id").value(duplicate.toString()))
            .andExpect(jsonPath("$.data.conflicts", hasItem("name")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("phone")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("email")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("bloodGroup")))
            .andExpect(jsonPath("$.data.conflicts", hasItem("allergies")))
            .andExpect(jsonPath("$.data.linkedRecords.notificationEvents").value(1))
            .andReturn();

    JsonNode fields =
        objectMapper
            .readTree(preview.getResponse().getContentAsString())
            .path("data")
            .path("fields");
    assertThat(fields.isArray()).isTrue();
    assertThat(fields).isNotEmpty();

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, duplicate, "{}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("MERGE_CONFLICTS"));

    assertThat(customerRepository.findById(duplicate).orElseThrow().getDeletedAt()).isNull();
  }

  @Test
  void ac04_duplicateIsSoftDeactivatedWithMergeProvenance() throws Exception {
    Tenant tenant = persistTenant("merge-soft", "Merge Soft");
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@merge-soft.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@merge-soft.local");

    UUID survivor = createCustomer(cookie, "Same Name", "9004000001");
    UUID duplicate = createCustomer(cookie, "Same Name", "9004000002");

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, duplicate, "{\"phone\":\"SURVIVOR\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(survivor.toString()));

    Customer duplicateRow = customerRepository.findById(duplicate).orElseThrow();
    assertThat(duplicateRow.getDeletedAt()).isNotNull();
    assertThat(duplicateRow.getMergedIntoId()).isEqualTo(survivor);
    assertThat(duplicateRow.getMergedAt()).isNotNull();
    assertThat(duplicateRow.getMergedByUserId()).isEqualTo(owner.getId());

    mockMvc
        .perform(get("/api/v1/customers/" + duplicate).cookie(cookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac05_deniedStalePhoneTakenAndCrossTenantFailAtomically() throws Exception {
    Tenant tenantA = persistTenant("merge-iso-a", "Merge Iso A");
    Tenant tenantB = persistTenant("merge-iso-b", "Merge Iso B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@merge-iso.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@merge-iso.local", AppUserRole.pharmacy_owner);
    AppUser salesOnly =
        persistUser(tenantA.getId(), "sales@merge-iso.local", AppUserRole.pharmacy_staff);
    Cookie ownerA = login("owner-a@merge-iso.local");

    UUID salesRole = createRole(ownerA, "Sales only", "[\"SALES\"]");
    mockMvc.perform(putRoles(salesOnly.getId(), ownerA, salesRole)).andExpect(status().isOk());
    Cookie salesCookie = login("sales@merge-iso.local");

    UUID survivor = createCustomer(ownerA, "One", "9005000001");
    UUID duplicate = createCustomer(ownerA, "Two", "9005000002");
    UUID left = createCustomer(ownerA, "Left", "9005000011");

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(salesCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", survivor, duplicate, "{}")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", survivor, duplicate, "{}")))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("EXECUTE", survivor, survivor, "{}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mergeJson(
                        "EXECUTE",
                        survivor,
                        duplicate,
                        "{\"name\":\"SURVIVOR\",\"phone\":\"SURVIVOR\"}")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mergeJson(
                        "EXECUTE",
                        survivor,
                        duplicate,
                        "{\"name\":\"SURVIVOR\",\"phone\":\"SURVIVOR\"}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    Cookie ownerB = login("owner-b@merge-iso.local");
    UUID foreign = createCustomer(ownerB, "Foreign", "9005000088");
    mockMvc
        .perform(
            post("/api/v1/customers/merge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mergeJson("PREVIEW", left, foreign, "{}")))
        .andExpect(status().isNotFound());
  }

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createCustomerFull(
      Cookie cookie,
      String name,
      String phone,
      String email,
      String bloodGroup,
      String allergies,
      String chronicConditions)
      throws Exception {
    String allergiesJson = allergies == null ? "null" : "\"" + allergies + "\"";
    String chronicJson = chronicConditions == null ? "null" : "\"" + chronicConditions + "\"";
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name":"%s",
                          "phone":"%s",
                          "email":"%s",
                          "bloodGroup":"%s",
                          "allergies":%s,
                          "chronicConditions":%s
                        }
                        """
                            .formatted(name, phone, email, bloodGroup, allergiesJson, chronicJson)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private static String mergeJson(
      String mode, UUID survivorId, UUID duplicateId, String resolutions) {
    return """
        {
          "mode":"%s",
          "survivorId":"%s",
          "duplicateId":"%s",
          "resolutions":%s
        }
        """
        .formatted(mode, survivorId, duplicateId, resolutions);
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder putRoles(
      UUID userId, Cookie owner, UUID roleId) {
    return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
            "/api/v1/users/" + userId + "/roles")
        .cookie(owner)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"roleIds\":[\"" + roleId + "\"]}");
  }

  private UUID createRole(Cookie owner, String name, String modulesJson) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/roles")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"modules\":" + modulesJson + "}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private Cookie login(String email) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    Cookie cookie = result.getResponse().getCookie("nmm_access");
    assertThat(cookie).isNotNull();
    return cookie;
  }

  private Tenant persistTenant(String slug, String name) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(name);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.save(tenant);
  }

  private void persistPlan(UUID tenantId, PlanCode plan) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(plan);
    sub.setStatus(SubscriptionStatus.ACTIVE);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.save(sub);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName(email);
    user.setRole(role);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
    return appUserRepository.save(user);
  }
}
