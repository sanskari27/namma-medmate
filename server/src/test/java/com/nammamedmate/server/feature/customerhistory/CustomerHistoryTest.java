package com.nammamedmate.server.feature.customerhistory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
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
import com.nammamedmate.server.persistence.CustomerHistoryFactRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
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
class CustomerHistoryTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T04:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_customer_history")
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
  @Autowired private CustomerHistoryFactRepository customerHistoryFactRepository;
  @Autowired private DoctorRepository doctorRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private CustomerHistoryService customerHistoryService;

  @BeforeEach
  void wipe() {
    customerHistoryFactRepository.deleteAll();
    doctorRepository.deleteAll();
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
  void ac01_historyReadsLinkedPrescriptionSaleFactsOnce() throws Exception {
    Tenant tenant = persistTenant("hist-ac01", "Hist AC01");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@hist-ac01.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@hist-ac01.local");

    UUID customerId = createCustomer(cookie, "Ravi", "9201000001");
    UUID invoiceId = UUID.randomUUID();

    customerHistoryService.recordFact(
        tenant.getId(),
        customerId,
        null,
        CustomerHistoryFactType.PURCHASE,
        "Sale INV-1",
        null,
        null,
        invoiceId,
        12_500L,
        T0.plusSeconds(60));
    customerHistoryService.recordFact(
        tenant.getId(),
        customerId,
        null,
        CustomerHistoryFactType.PRESCRIPTION,
        "Rx REF-88",
        "REF-88",
        null,
        invoiceId,
        null,
        T0.plusSeconds(60));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/history").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(jsonPath("$.data.items[0].type").exists())
        .andExpect(jsonPath("$.data.items[?(@.type=='PURCHASE')]", hasSize(1)))
        .andExpect(jsonPath("$.data.items[?(@.type=='PRESCRIPTION')]", hasSize(1)))
        .andExpect(
            jsonPath("$.data.items[?(@.type=='PRESCRIPTION')].prescriptionReference")
                .value("REF-88"))
        .andExpect(jsonPath("$.data.items[?(@.type=='PURCHASE')].amountPaise").value(12500));

    assertThat(customerHistoryFactRepository.count()).isEqualTo(2);
  }

  @Test
  void ac04_missingCustomerIsNotFound() throws Exception {
    Tenant tenant = persistTenant("hist-404", "Hist 404");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@hist-404.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@hist-404.local");

    mockMvc
        .perform(get("/api/v1/customers/" + UUID.randomUUID() + "/history").cookie(cookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void ac04_crossTenantHistoryIsUndisclosed() throws Exception {
    Tenant tenantA = persistTenant("hist-a", "Hist A");
    Tenant tenantB = persistTenant("hist-b", "Hist B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@hist.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@hist.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@hist.local");
    Cookie ownerB = login("owner-b@hist.local");

    UUID customerA = createCustomer(ownerA, "A Customer", "9202000001");
    customerHistoryService.recordFact(
        tenantA.getId(),
        customerA,
        null,
        CustomerHistoryFactType.PURCHASE,
        "Private sale",
        null,
        null,
        UUID.randomUUID(),
        1000L,
        T0);

    mockMvc
        .perform(get("/api/v1/customers/" + customerA + "/history").cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void ac04_crmDeniedBlocksHistory() throws Exception {
    Tenant tenant = persistTenant("hist-deny", "Hist Deny");
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@hist-deny.local", AppUserRole.pharmacy_owner);
    AppUser staff =
        persistUser(tenant.getId(), "staff@hist-deny.local", AppUserRole.pharmacy_staff);
    Cookie ownerCookie = login("owner@hist-deny.local");
    UUID salesOnly = createRole(ownerCookie, "Sales only", "[\"SALES\"]");
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + staff.getId() + "/roles")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesOnly + "\"]}"))
        .andExpect(status().isOk());

    UUID customerId = createCustomer(ownerCookie, "Denied", "9203000001");
    Cookie staffCookie = login("staff@hist-deny.local");

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/history").cookie(staffCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    assertThat(owner.getEmail()).isEqualTo("owner@hist-deny.local");
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
