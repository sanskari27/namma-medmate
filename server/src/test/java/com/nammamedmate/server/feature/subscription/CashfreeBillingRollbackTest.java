package com.nammamedmate.server.feature.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.CashfreeBillingPolicy;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.cashfree.CashfreePgAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.SubscriptionPaymentRepository;
import com.nammamedmate.server.persistence.SubscriptionUpgradeIntentRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class CashfreeBillingRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T16:30:00Z");

  @MockBean private CashfreePgAdapter cashfreePgAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private SubscriptionPaymentRepository paymentRepository;
  @Autowired private SubscriptionUpgradeIntentRepository intentRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void adapterFailureLeavesNoCheckoutOrPlanChange() throws Exception {
    Tenant tenant = persistTenant();
    persistPlan(tenant.getId());
    persistOwner(tenant.getId(), "owner@cf-roll.local");
    Cookie cookie = login("owner@cf-roll.local");
    when(cashfreePgAdapter.configured()).thenReturn(true);
    when(cashfreePgAdapter.createOrder(any())).thenThrow(new IllegalStateException("down"));

    mockMvc
        .perform(
            post("/api/v1/subscriptions/payments/cashfree")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"planCode\":\"STARTER\",\"idempotencyKey\":\"" + UUID.randomUUID() + "\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CashfreeBillingPolicy.PROVIDER_UNAVAILABLE));

    assertThat(paymentRepository.count()).isZero();
    assertThat(intentRepository.count()).isZero();
    assertThat(
            tenantSubscriptionRepository.findByTenantId(tenant.getId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);
  }

  @Test
  void blankProviderLeavesNoPartialWrite() throws Exception {
    Tenant tenant = persistTenant();
    persistPlan(tenant.getId());
    persistOwner(tenant.getId(), "owner@cf-blank.local");
    Cookie cookie = login("owner@cf-blank.local");
    when(cashfreePgAdapter.configured()).thenReturn(false);

    mockMvc
        .perform(
            post("/api/v1/subscriptions/payments/cashfree")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"planCode\":\"STARTER\",\"idempotencyKey\":\"" + UUID.randomUUID() + "\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CashfreeBillingPolicy.PROVIDER_UNAVAILABLE));
    assertThat(paymentRepository.count()).isZero();
    assertThat(intentRepository.count()).isZero();
  }

  private Tenant persistTenant() {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug("cf-roll-" + tenant.getId().toString().substring(0, 8));
    tenant.setName("Roll Chemist");
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }

  private void persistPlan(UUID tenantId) {
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(PlanCode.FREE);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(T0);
    subscription.setCreatedAt(T0);
    subscription.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(subscription);
  }

  private void persistOwner(UUID tenantId, String email) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setDisplayName("Owner");
    user.setRole(AppUserRole.pharmacy_owner);
    user.setActive(true);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    appUserRepository.saveAndFlush(user);
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
}
