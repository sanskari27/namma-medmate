package com.nammamedmate.server.feature.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
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
class CustomerTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_customer")
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
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
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
  void ac01_createAndUpdatePersistFullCustomerFields() throws Exception {
    Tenant tenant = persistTenant("fields", "Fields Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fields.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fields.local");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(fullCreateJson("Ravi Kumar", "9876500001")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.name").value("Ravi Kumar"))
            .andExpect(jsonPath("$.data.phone").value("9876500001"))
            .andExpect(jsonPath("$.data.email").value("ravi@example.com"))
            .andExpect(jsonPath("$.data.dateOfBirth").value("1988-04-12"))
            .andExpect(jsonPath("$.data.gender").value("MALE"))
            .andExpect(jsonPath("$.data.address").value("12 MG Road, Bengaluru"))
            .andExpect(jsonPath("$.data.bloodGroup").value("B+"))
            .andExpect(jsonPath("$.data.allergies").value("Penicillin"))
            .andExpect(jsonPath("$.data.chronicConditions").value("Diabetes"))
            .andExpect(jsonPath("$.data.password").doesNotExist())
            .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
            .andExpect(jsonPath("$.data.pin").doesNotExist())
            .andReturn();

    UUID id =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(
            patch("/api/v1/customers/" + id)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "name":"Ravi K",
                      "phone":"9876500001",
                      "email":"ravi.k@example.com",
                      "dateOfBirth":"1988-04-12",
                      "gender":"MALE",
                      "address":"14 MG Road",
                      "bloodGroup":"B+",
                      "allergies":"Penicillin, Sulfa",
                      "chronicConditions":"Diabetes, Hypertension"
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Ravi K"))
        .andExpect(jsonPath("$.data.address").value("14 MG Road"))
        .andExpect(jsonPath("$.data.allergies").value("Penicillin, Sulfa"))
        .andExpect(jsonPath("$.data.chronicConditions").value("Diabetes, Hypertension"));

    Customer stored = customerRepository.findById(id).orElseThrow();
    assertThat(stored.getTenantId()).isEqualTo(tenant.getId());
    assertThat(stored.getName()).isEqualTo("Ravi K");
    assertThat(stored.getChronicConditions()).isEqualTo("Diabetes, Hypertension");
  }

  @Test
  void ac02_phoneUniqueWithinTenantNotAcrossTenants() throws Exception {
    Tenant tenantA = persistTenant("phone-a", "Phone A");
    Tenant tenantB = persistTenant("phone-b", "Phone B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@phone.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@phone.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@phone.local");
    Cookie ownerB = login("owner-b@phone.local");

    mockMvc
        .perform(
            post("/api/v1/customers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalCreateJson("Anita", "9000000001")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/customers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalCreateJson("Duplicate Anita", "9000000001")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("PHONE_TAKEN"));

    mockMvc
        .perform(
            post("/api/v1/customers")
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalCreateJson("Anita B", "9000000001")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.phone").value("9000000001"));

    assertThat(customerRepository.count()).isEqualTo(2);
  }

  @Test
  void ac03_profilesAreTenantWideVisibleToCrmStaff() throws Exception {
    Tenant tenant = persistTenant("wide", "Wide Chemist");
    persistPlan(tenant.getId(), PlanCode.STARTER);
    persistUser(tenant.getId(), "owner@wide.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "crm@wide.local", AppUserRole.pharmacy_staff);
    Cookie owner = login("owner@wide.local");

    mockMvc
        .perform(
            post("/api/v1/customers")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalCreateJson("Meera", "9111100001")))
        .andExpect(status().isOk());

    UUID crmRole = createRole(owner, "CRM desk", "[\"CRM\"]");
    mockMvc.perform(putRoles(staff.getId(), owner, crmRole)).andExpect(status().isOk());

    Cookie crmStaff = login("crm@wide.local");
    mockMvc
        .perform(get("/api/v1/customers").cookie(crmStaff))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].name").value("Meera"))
        .andExpect(jsonPath("$.data.items[0].phone").value("9111100001"));

    mockMvc
        .perform(get("/api/v1/customers").param("q", "91111").cookie(crmStaff))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)));
  }

  @Test
  void ac04_customersHaveNoLoginInPhase1() throws Exception {
    Tenant tenant = persistTenant("nologin", "No Login Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@nologin.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@nologin.local");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(minimalCreateJson("Walk-in", "9222200001")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Walk-in"))
            .andReturn();

    JsonNode data = objectMapper.readTree(created.getResponse().getContentAsString()).path("data");
    assertThat(data.has("password")).isFalse();
    assertThat(data.has("passwordHash")).isFalse();
    assertThat(data.has("pinHash")).isFalse();
    assertThat(data.has("mustChangePassword")).isFalse();

    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"9222200001\",\"password\":\"anything-long-enough\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void ac05_deniedValidationConflictAndCrossTenantIsolation() throws Exception {
    Tenant tenantA = persistTenant("iso-a", "Iso A");
    Tenant tenantB = persistTenant("iso-b", "Iso B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@iso.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@iso.local", AppUserRole.pharmacy_owner);
    AppUser salesOnly = persistUser(tenantA.getId(), "sales@iso.local", AppUserRole.pharmacy_staff);
    Cookie ownerA = login("owner-a@iso.local");
    Cookie ownerB = login("owner-b@iso.local");

    UUID salesRole = createRole(ownerA, "Sales only", "[\"SALES\"]");
    mockMvc.perform(putRoles(salesOnly.getId(), ownerA, salesRole)).andExpect(status().isOk());
    Cookie salesCookie = login("sales@iso.local");

    mockMvc
        .perform(get("/api/v1/customers").cookie(salesCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc.perform(get("/api/v1/customers")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/customers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\",\"phone\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(ownerA)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(minimalCreateJson("Priya", "9333300001")))
            .andExpect(status().isOk())
            .andReturn();
    UUID customerId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(
            post("/api/v1/customers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalCreateJson("Priya Dup", "9333300001")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("PHONE_TAKEN"))
        .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("phone")));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId).cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            patch("/api/v1/customers/" + customerId)
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalCreateJson("Stolen", "9333300001")))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(get("/api/v1/customers").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)))
        .andExpect(jsonPath("$.data.items[*].id", not(hasItem(customerId.toString()))));
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

  private static String minimalCreateJson(String name, String phone) {
    return "{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\"}";
  }

  private static String fullCreateJson(String name, String phone) {
    return """
        {
          "name":"%s",
          "phone":"%s",
          "email":"ravi@example.com",
          "dateOfBirth":"1988-04-12",
          "gender":"MALE",
          "address":"12 MG Road, Bengaluru",
          "bloodGroup":"B+",
          "allergies":"Penicillin",
          "chronicConditions":"Diabetes"
        }
        """
        .formatted(name, phone);
  }
}
