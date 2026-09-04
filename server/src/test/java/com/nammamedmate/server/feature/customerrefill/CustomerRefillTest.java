package com.nammamedmate.server.feature.customerrefill;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
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
import com.nammamedmate.server.persistence.CustomerRefillScheduleRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.CustomerTagAssignmentRepository;
import com.nammamedmate.server.persistence.CustomerTagRepository;
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
class CustomerRefillTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T06:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_customer_refill")
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
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private CustomerRefillScheduleRepository refillRepository;
  @Autowired private CustomerTagRepository tagRepository;
  @Autowired private CustomerTagAssignmentRepository assignmentRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    assignmentRepository.deleteAll();
    tagRepository.deleteAll();
    refillRepository.deleteAll();
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
  void ac01_refillDueDatesArePerCustomerAndMedicineAndCustomizable() throws Exception {
    Tenant tenant = persistTenant("refill-ac01", "Refill AC01");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@refill-ac01.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@refill-ac01.local");
    UUID customerId = createCustomer(cookie, "Refill Me", "9401000001");

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/refills")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"Metformin 500\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.medicineName").value("Metformin 500"))
        .andExpect(jsonPath("$.data.intervalDays").value(30))
        .andExpect(jsonPath("$.data.version").value(0))
        .andExpect(jsonPath("$.data.nextDueOn").isNotEmpty());

    String listBody =
        mockMvc
            .perform(get("/api/v1/customers/" + customerId + "/refills").cookie(cookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items", hasSize(1)))
            .andExpect(jsonPath("$.data.items[0].medicineName").value("Metformin 500"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID refillId =
        UUID.fromString(
            objectMapper.readTree(listBody).path("data").path("items").get(0).path("id").asText());
    long version =
        objectMapper.readTree(listBody).path("data").path("items").get(0).path("version").asLong();

    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/refills/" + refillId)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"intervalDays\":14,\"nextDueOn\":\"2026-08-01\",\"expectedVersion\":"
                        + version
                        + "}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.intervalDays").value(14))
        .andExpect(jsonPath("$.data.nextDueOn").value("2026-08-01"))
        .andExpect(jsonPath("$.data.version").value(version + 1));

    mockMvc
        .perform(get("/api/v1/customers/refills/due").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].customerId").value(customerId.toString()))
        .andExpect(jsonPath("$.data.items[0].medicineName").value("Metformin 500"))
        .andExpect(jsonPath("$.data.items[0].nextDueOn").value("2026-08-01"));
  }

  @Test
  void ac02_tagsSupportTenantDefinedSegmentation() throws Exception {
    Tenant tenant = persistTenant("refill-ac02", "Refill AC02");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@refill-ac02.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@refill-ac02.local");
    UUID c1 = createCustomer(cookie, "Diabetic A", "9401000002");
    UUID c2 = createCustomer(cookie, "Diabetic B", "9401000003");

    String tagBody =
        mockMvc
            .perform(
                post("/api/v1/customers/tags")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"diabetic\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("diabetic"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID tagId = UUID.fromString(objectMapper.readTree(tagBody).path("data").path("id").asText());

    mockMvc
        .perform(get("/api/v1/customers/tags").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].name").value("diabetic"));

    mockMvc
        .perform(
            put("/api/v1/customers/" + c1 + "/tags")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tagIds\":[\"" + tagId + "\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(tagId.toString()));

    mockMvc
        .perform(
            put("/api/v1/customers/" + c2 + "/tags")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tagIds\":[\"" + tagId + "\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)));

    mockMvc
        .perform(get("/api/v1/customers/" + c1 + "/tags").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].name").value("diabetic"));

    mockMvc
        .perform(
            put("/api/v1/customers/" + c1 + "/tags")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tagIds\":[]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac03_duplicateMedicineNameRejected() throws Exception {
    Tenant tenant = persistTenant("refill-dup", "Refill Dup");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@refill-dup.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@refill-dup.local");
    UUID customerId = createCustomer(cookie, "Dup", "9401000004");

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/refills")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"Aspirin\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/refills")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"aspirin\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_REFILL"));
  }

  @Test
  void ac03_duplicateTagNameRejected() throws Exception {
    Tenant tenant = persistTenant("tag-dup", "Tag Dup");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@tag-dup.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@tag-dup.local");

    mockMvc
        .perform(
            post("/api/v1/customers/tags")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Senior\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/customers/tags")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"senior\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_TAG"));
  }

  @Test
  void ac03_invalidScheduleRejected() throws Exception {
    Tenant tenant = persistTenant("refill-inv", "Refill Inv");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@refill-inv.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@refill-inv.local");
    UUID customerId = createCustomer(cookie, "Inv", "9401000005");

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/refills")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"  \"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/refills")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"Ok\",\"intervalDays\":0}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void ac03_staleRefillVersionRejected() throws Exception {
    Tenant tenant = persistTenant("refill-stale", "Refill Stale");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@refill-stale.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@refill-stale.local");
    UUID customerId = createCustomer(cookie, "Stale", "9401000006");

    String body =
        mockMvc
            .perform(
                post("/api/v1/customers/" + customerId + "/refills")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"medicineName\":\"Stale Med\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID refillId = UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());

    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/refills/" + refillId)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"intervalDays\":7,\"nextDueOn\":\"2026-09-10\",\"expectedVersion\":99}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
  }

  @Test
  void ac03_crmDeniedBlocksRefillAndTags() throws Exception {
    Tenant tenant = persistTenant("refill-deny", "Refill Deny");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@refill-deny.local", AppUserRole.pharmacy_owner);
    AppUser staff =
        persistUser(tenant.getId(), "staff@refill-deny.local", AppUserRole.pharmacy_staff);
    Cookie owner = login("owner@refill-deny.local");
    UUID salesOnly = createRole(owner, "Sales only", "[\"SALES\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesOnly + "\"]}"))
        .andExpect(status().isOk());
    UUID customerId = createCustomer(owner, "Denied", "9401000007");
    Cookie staffCookie = login("staff@refill-deny.local");

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/refills").cookie(staffCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(get("/api/v1/customers/tags").cookie(staffCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void ac03_crossTenantRefillIsUndisclosed() throws Exception {
    Tenant tenantA = persistTenant("refill-a", "Refill A");
    Tenant tenantB = persistTenant("refill-b", "Refill B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@refill.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@refill.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@refill.local");
    Cookie ownerB = login("owner-b@refill.local");
    UUID customerA = createCustomer(ownerA, "A", "9401000008");

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerA + "/refills")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"medicineName\":\"Secret\",\"nextDueOn\":\"2026-08-01\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/customers/" + customerA + "/refills").cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(get("/api/v1/customers/refills/due").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac03_deleteTagInUseRejected() throws Exception {
    Tenant tenant = persistTenant("tag-use", "Tag Use");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@tag-use.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@tag-use.local");
    UUID customerId = createCustomer(cookie, "Tagged", "9401000009");

    String tagBody =
        mockMvc
            .perform(
                post("/api/v1/customers/tags")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"high-value\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID tagId = UUID.fromString(objectMapper.readTree(tagBody).path("data").path("id").asText());

    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/tags")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tagIds\":[\"" + tagId + "\"]}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(delete("/api/v1/customers/tags/" + tagId).cookie(cookie))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("TAG_IN_USE"));

    assertThat(tagRepository.findById(tagId)).isPresent();
  }

  @Test
  void deleteRefillRemovesSchedule() throws Exception {
    Tenant tenant = persistTenant("refill-del", "Refill Del");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@refill-del.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@refill-del.local");
    UUID customerId = createCustomer(cookie, "Del", "9401000010");

    String body =
        mockMvc
            .perform(
                post("/api/v1/customers/" + customerId + "/refills")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"medicineName\":\"Temp\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID refillId = UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());

    mockMvc
        .perform(delete("/api/v1/customers/" + customerId + "/refills/" + refillId).cookie(cookie))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/refills").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
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
