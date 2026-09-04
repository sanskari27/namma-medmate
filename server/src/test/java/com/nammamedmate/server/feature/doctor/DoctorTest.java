package com.nammamedmate.server.feature.doctor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class DoctorTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T04:10:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private DoctorRepository doctorRepository;
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
  void ac02_doctorIsReferenceRecordWithNoLogin() throws Exception {
    Tenant tenant = persistTenant("doc-ac02", "Doc AC02");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@doc-ac02.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@doc-ac02.local");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/doctors")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name":"Dr. Mehta",
                          "registrationNumber":"KA-12345",
                          "phone":"9888000001",
                          "notes":"Cardiology referrals"
                        }
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.name").value("Dr. Mehta"))
            .andExpect(jsonPath("$.data.registrationNumber").value("KA-12345"))
            .andExpect(jsonPath("$.data.password").doesNotExist())
            .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
            .andExpect(jsonPath("$.data.pin").doesNotExist())
            .andExpect(jsonPath("$.data.email").doesNotExist())
            .andReturn();

    UUID doctorId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(
            patch("/api/v1/doctors/" + doctorId)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "name":"Dr. Mehta Updated",
                      "registrationNumber":"KA-12345",
                      "phone":"9888000002",
                      "notes":"Updated"
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Dr. Mehta Updated"));

    mockMvc
        .perform(get("/api/v1/doctors").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(doctorId.toString()));

    mockMvc
        .perform(delete("/api/v1/doctors/" + doctorId).cookie(cookie))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/doctors").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac03_doctorReferencesSupportTopReferringReporting() throws Exception {
    Tenant tenant = persistTenant("doc-top", "Doc Top");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@doc-top.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@doc-top.local");

    UUID customerId = createCustomer(cookie, "Patient", "9211000001");
    UUID top = createDoctor(cookie, "Dr. Top", "TOP-1");
    UUID second = createDoctor(cookie, "Dr. Second", "SEC-1");

    for (int i = 0; i < 3; i++) {
      customerHistoryService.recordFact(
          tenant.getId(),
          customerId,
          null,
          CustomerHistoryFactType.PRESCRIPTION,
          "Rx " + i,
          "R-" + i,
          top,
          UUID.randomUUID(),
          null,
          T0.plusSeconds(i));
    }
    customerHistoryService.recordFact(
        tenant.getId(),
        customerId,
        null,
        CustomerHistoryFactType.PRESCRIPTION,
        "Rx S",
        "R-S",
        second,
        UUID.randomUUID(),
        null,
        T0.plusSeconds(10));

    mockMvc
        .perform(get("/api/v1/doctors/top-referring").cookie(cookie).param("limit", "5"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(jsonPath("$.data.items[0].id").value(top.toString()))
        .andExpect(jsonPath("$.data.items[0].referralCount").value(3))
        .andExpect(jsonPath("$.data.items[1].id").value(second.toString()))
        .andExpect(jsonPath("$.data.items[1].referralCount").value(1));
  }

  @Test
  void ac04_duplicateRegistrationIsConflict() throws Exception {
    Tenant tenant = persistTenant("doc-dup", "Doc Dup");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@doc-dup.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@doc-dup.local");

    createDoctor(cookie, "Dr. One", "DUP-1");
    mockMvc
        .perform(
            post("/api/v1/doctors")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Dr. Two\",\"registrationNumber\":\"DUP-1\",\"phone\":null,\"notes\":null}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("REGISTRATION_TAKEN"));
  }

  @Test
  void ac04_crossTenantDoctorIsUndisclosed() throws Exception {
    Tenant tenantA = persistTenant("doc-a", "Doc A");
    Tenant tenantB = persistTenant("doc-b", "Doc B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@doc.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@doc.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@doc.local");
    Cookie ownerB = login("owner-b@doc.local");

    UUID doctorA = createDoctor(ownerA, "Dr. A", "A-1");

    mockMvc
        .perform(get("/api/v1/doctors/" + doctorA).cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(get("/api/v1/doctors").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac04_crmDeniedBlocksDoctorCreate() throws Exception {
    Tenant tenant = persistTenant("doc-deny", "Doc Deny");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@doc-deny.local", AppUserRole.pharmacy_owner);
    AppUser staff = persistUser(tenant.getId(), "staff@doc-deny.local", AppUserRole.pharmacy_staff);
    Cookie ownerCookie = login("owner@doc-deny.local");
    UUID salesOnly = createRole(ownerCookie, "Sales only", "[\"SALES\"]");
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + staff.getId() + "/roles")
                .cookie(ownerCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesOnly + "\"]}"))
        .andExpect(status().isOk());

    Cookie staffCookie = login("staff@doc-deny.local");
    mockMvc
        .perform(
            post("/api/v1/doctors")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Dr. Denied\",\"registrationNumber\":\"DENY-1\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(get("/api/v1/doctors").cookie(staffCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
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

  private UUID createDoctor(Cookie cookie, String name, String registration) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/doctors")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\""
                            + name
                            + "\",\"registrationNumber\":\""
                            + registration
                            + "\"}"))
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
