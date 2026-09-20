package com.nammamedmate.server.feature.dpdp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DpdpRequestRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
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

class DpdpRequestRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private DpdpRequestRepository dpdpRequestRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    dpdpRequestRepository.deleteAll();
    customerRepository.deleteAll();
    userSessionRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void invalidCreateLeavesNoPartialRequest() throws Exception {
    Tenant tenant = persistTenant();
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@roll-dpdp.local", AppUserRole.pharmacy_owner);
    Cookie owner = login("owner@roll-dpdp.local");

    mockMvc
        .perform(
            post("/api/v1/dpdp/requests")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"principalType\":\"\",\"requestType\":\"\"}"))
        .andExpect(status().isBadRequest());

    assertThat(dpdpRequestRepository.count()).isZero();
  }

  @Test
  void failedCorrectionLeavesCustomerUnchanged() throws Exception {
    Tenant tenant = persistTenant();
    persistPlan(tenant.getId());
    persistUser(tenant.getId(), "owner@roll-dpdp.local", AppUserRole.pharmacy_owner);
    Cookie owner = login("owner@roll-dpdp.local");
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenant.getId());
    customer.setName("Keep Me");
    customer.setPhone("9111100001");
    customer.setCreatedAt(T0);
    customer.setUpdatedAt(T0);
    customerRepository.save(customer);

    String created =
        mockMvc
            .perform(
                post("/api/v1/dpdp/requests")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"principalType\":\"CUSTOMER\",\"requestType\":\"CORRECTION\",\"principalId\":\""
                            + customer.getId()
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID id =
        UUID.fromString(
            new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(created)
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/accept")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identityMethod\":\"Checked\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/dpdp/requests/" + id + "/decide")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"FULFILLED\",\"correction\":{\"name\":\"\"}}"))
        .andExpect(status().isBadRequest());

    Customer stored = customerRepository.findById(customer.getId()).orElseThrow();
    assertThat(stored.getName()).isEqualTo("Keep Me");
    assertThat(stored.getPhone()).isEqualTo("9111100001");
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

  private Tenant persistTenant() {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug("roll-dpdp");
    tenant.setName("Roll DPDP");
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.save(tenant);
  }

  private void persistPlan(UUID tenantId) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(PlanCode.FREE);
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
