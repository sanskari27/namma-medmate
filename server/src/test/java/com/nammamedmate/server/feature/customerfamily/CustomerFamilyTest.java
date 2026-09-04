package com.nammamedmate.server.feature.customerfamily;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.application.customerhistory.CustomerHistoryService;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.CustomerHistoryFactType;
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
import com.nammamedmate.server.persistence.CustomerFamilyMemberRepository;
import com.nammamedmate.server.persistence.CustomerFamilyRepository;
import com.nammamedmate.server.persistence.CustomerHistoryFactRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
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
class CustomerFamilyTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T03:30:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_customer_family")
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
  @Autowired private CustomerFamilyRepository customerFamilyRepository;
  @Autowired private CustomerFamilyMemberRepository customerFamilyMemberRepository;
  @Autowired private CustomerHistoryFactRepository customerHistoryFactRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private CustomerHistoryService customerHistoryService;

  @BeforeEach
  void wipe() {
    customerHistoryFactRepository.deleteAll();
    customerFamilyMemberRepository.deleteAll();
    customerFamilyRepository.deleteAll();
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
  void ac01_profileBelongsToAtMostOneFamilyGroup() throws Exception {
    Tenant tenant = persistTenant("fam-one", "Fam One");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fam-one.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fam-one.local");

    UUID parent = createCustomer(cookie, "Parent", "9101000001");
    UUID child = createCustomer(cookie, "Child", "9101000002");
    UUID other = createCustomer(cookie, "Other", "9101000003");

    UUID familyId = createFamily(cookie, parent, child);

    mockMvc
        .perform(
            post("/api/v1/customer-families")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createFamilyJson(parent, other)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ALREADY_IN_FAMILY"));

    mockMvc
        .perform(
            post("/api/v1/customer-families/" + familyId + "/members")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":\"" + other + "\"}"))
        .andExpect(status().isOk());

    UUID secondFamily = createFamily(cookie, createCustomer(cookie, "Solo", "9101000004"));
    mockMvc
        .perform(
            post("/api/v1/customer-families/" + secondFamily + "/members")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":\"" + child + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ALREADY_IN_FAMILY"));

    assertThat(customerFamilyMemberRepository.findAll()).hasSize(4);
  }

  @Test
  void ac02_linksDoNotMergeIdentities() throws Exception {
    Tenant tenant = persistTenant("fam-merge", "Fam Merge");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fam-merge.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fam-merge.local");

    UUID a = createCustomer(cookie, "Anita", "9102000001");
    UUID b = createCustomer(cookie, "Bala", "9102000002");
    UUID familyId = createFamily(cookie, a, b);

    mockMvc
        .perform(get("/api/v1/customers/" + a).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(a.toString()))
        .andExpect(jsonPath("$.data.name").value("Anita"))
        .andExpect(jsonPath("$.data.phone").value("9102000001"));

    mockMvc
        .perform(get("/api/v1/customers/" + b).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(b.toString()))
        .andExpect(jsonPath("$.data.name").value("Bala"))
        .andExpect(jsonPath("$.data.phone").value("9102000002"));

    assertThat(customerRepository.findById(a).orElseThrow().getDeletedAt()).isNull();
    assertThat(customerRepository.findById(b).orElseThrow().getDeletedAt()).isNull();
    assertThat(customerRepository.findById(a).orElseThrow().getMergedIntoId()).isNull();
    assertThat(customerRepository.findById(b).orElseThrow().getMergedIntoId()).isNull();

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.members", hasSize(2)))
        .andExpect(jsonPath("$.data.members[?(@.id=='" + a + "')].name").value("Anita"))
        .andExpect(jsonPath("$.data.members[?(@.id=='" + b + "')].name").value("Bala"));
  }

  @Test
  void ac03_individualRecordsRemainDistinguishableInFamilyHistory() throws Exception {
    Tenant tenant = persistTenant("fam-hist", "Fam Hist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fam-hist.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fam-hist.local");

    UUID a = createCustomer(cookie, "Meera", "9103000001");
    UUID b = createCustomer(cookie, "Ravi", "9103000002");
    UUID familyId = createFamily(cookie, a, b);

    customerHistoryService.recordFact(
        tenant.getId(),
        a,
        null,
        CustomerHistoryFactType.PURCHASE,
        "Meera purchase",
        null,
        null,
        UUID.randomUUID(),
        5000L,
        T0);
    customerHistoryService.recordFact(
        tenant.getId(),
        b,
        null,
        CustomerHistoryFactType.PRESCRIPTION,
        "Ravi Rx",
        "RX-B",
        null,
        UUID.randomUUID(),
        null,
        T0.plusSeconds(30));

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId + "/history").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(
            jsonPath("$.data.items[?(@.customerId=='" + a + "')].customerName").value("Meera"))
        .andExpect(
            jsonPath("$.data.items[?(@.customerId=='" + b + "')].customerName").value("Ravi"))
        .andExpect(jsonPath("$.data.items[?(@.type=='PURCHASE')]", hasSize(1)))
        .andExpect(jsonPath("$.data.items[?(@.type=='PRESCRIPTION')]", hasSize(1)));

    mockMvc
        .perform(
            get("/api/v1/customer-families/" + familyId + "/history")
                .cookie(cookie)
                .param("memberId", a.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].customerId").value(a.toString()))
        .andExpect(jsonPath("$.data.items[0].type").value("PURCHASE"));

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.members", hasSize(2)))
        .andExpect(jsonPath("$.data.members[0].id").exists())
        .andExpect(jsonPath("$.data.members[0].name").exists())
        .andExpect(jsonPath("$.data.members[0].phone").exists())
        .andExpect(jsonPath("$.data.members[1].id").exists());
  }

  @Test
  void ac04_familyRelationshipsStayTenantScoped() throws Exception {
    Tenant tenantA = persistTenant("fam-a", "Fam A");
    Tenant tenantB = persistTenant("fam-b", "Fam B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@fam.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@fam.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@fam.local");
    Cookie ownerB = login("owner-b@fam.local");

    UUID a1 = createCustomer(ownerA, "A1", "9104000001");
    UUID a2 = createCustomer(ownerA, "A2", "9104000002");
    UUID b1 = createCustomer(ownerB, "B1", "9104000003");
    UUID familyA = createFamily(ownerA, a1, a2);
    UUID familyB = createFamily(ownerB, b1);

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyB).cookie(ownerA))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/customer-families/" + familyA + "/members")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":\"" + b1 + "\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(get("/api/v1/customer-families").cookie(ownerA).param("customerId", b1.toString()))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(get("/api/v1/customer-families").cookie(ownerA).param("customerId", a1.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(familyA.toString()));
  }

  @Test
  void ac05_deniedSelfLinkDuplicateAndDeletedFailSafely() throws Exception {
    Tenant tenant = persistTenant("fam-fail", "Fam Fail");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fam-fail.local", AppUserRole.pharmacy_owner);
    AppUser salesOnly =
        persistUser(tenant.getId(), "sales@fam-fail.local", AppUserRole.pharmacy_staff);
    Cookie owner = login("owner@fam-fail.local");

    UUID salesRole = createRole(owner, "Sales only", "[\"SALES\"]");
    mockMvc.perform(putRoles(salesOnly.getId(), owner, salesRole)).andExpect(status().isOk());
    Cookie salesCookie = login("sales@fam-fail.local");

    UUID a = createCustomer(owner, "Alpha", "9105000001");
    UUID b = createCustomer(owner, "Beta", "9105000002");
    UUID familyId = createFamily(owner, a);

    mockMvc
        .perform(
            post("/api/v1/customer-families")
                .cookie(salesCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createFamilyJson(a, b)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(
            post("/api/v1/customer-families")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createFamilyJson(a, b)))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/customer-families")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createFamilyJson(b, b)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("SELF_LINK"));

    mockMvc
        .perform(
            post("/api/v1/customer-families/" + familyId + "/members")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":\"" + a + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ALREADY_IN_FAMILY"));

    mockMvc
        .perform(
            post("/api/v1/customer-families/" + familyId + "/members")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":\"" + b + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/customer-families/" + familyId + "/members")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":\"" + b + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ALREADY_IN_FAMILY"));

    UUID deleted = createCustomer(owner, "Gone Soon", "9105000003");
    var row = customerRepository.findById(deleted).orElseThrow();
    row.setDeletedAt(T0);
    customerRepository.save(row);

    mockMvc
        .perform(
            post("/api/v1/customer-families/" + familyId + "/members")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\":\"" + deleted + "\"}"))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(delete("/api/v1/customer-families/" + familyId + "/members/" + b).cookie(owner))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/customer-families/" + familyId).cookie(owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.members", hasSize(1)));
  }

  private UUID createFamily(Cookie cookie, UUID... memberIds) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customer-families")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createFamilyJson(memberIds)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private static String createFamilyJson(UUID... memberIds) {
    StringBuilder members = new StringBuilder();
    for (int i = 0; i < memberIds.length; i++) {
      if (i > 0) {
        members.append(',');
      }
      members.append('"').append(memberIds[i]).append('"');
    }
    return "{\"memberIds\":[" + members + "]}";
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
