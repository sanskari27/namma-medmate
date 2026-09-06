package com.nammamedmate.server.feature.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.CashfreeBillingPolicy;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionPaymentStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.cashfree.CashfreeCreateOrderRequest;
import com.nammamedmate.server.infrastructure.cashfree.CashfreeOrderResult;
import com.nammamedmate.server.infrastructure.cashfree.CashfreePgAdapter;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.SubscriptionPaymentRepository;
import com.nammamedmate.server.persistence.SubscriptionUpgradeIntentRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class CashfreeBillingTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T16:00:00Z");
  private static final String CHECKOUT = "/api/v1/subscriptions/payments/cashfree";

  @MockBean private CashfreePgAdapter cashfreePgAdapter;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private SubscriptionPaymentRepository paymentRepository;
  @Autowired private SubscriptionUpgradeIntentRepository intentRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Value("${app.cashfree.webhook-secret}")
  private String webhookSecret;

  private final AtomicInteger orders = new AtomicInteger();

  @BeforeEach
  void stubAdapter() {
    when(cashfreePgAdapter.configured()).thenReturn(true);
    when(cashfreePgAdapter.createOrder(any()))
        .thenAnswer(
            invocation -> {
              CashfreeCreateOrderRequest request = invocation.getArgument(0);
              int n = orders.incrementAndGet();
              return new CashfreeOrderResult(
                  request.orderId(), "session-" + n, "https://sandbox.cashfree.com/checkout/" + n);
            });
    when(cashfreePgAdapter.fetchOrder(any())).thenReturn(Optional.empty());
  }

  @Test
  void ac01_posHasNoCashfreeRouteAndAdapterStaysIdle() throws Exception {
    Fixture fx = seed("cf-pos");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + UUID.randomUUID() + "/cashfree")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isNotFound());
    verify(cashfreePgAdapter, never()).createOrder(any());
  }

  @Test
  void ac02_checkoutAmountAndPlanAreServerSide() throws Exception {
    Fixture fx = seed("cf-amt");
    String key = UUID.randomUUID().toString();
    MvcResult result =
        mockMvc
            .perform(
                post(CHECKOUT)
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"planCode\":\"STARTER\",\"idempotencyKey\":\""
                            + key
                            + "\",\"amountPaise\":1}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.planCode").value("STARTER"))
            .andExpect(jsonPath("$.data.amountPaise").value(69900))
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andReturn();
    JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    assertThat(
            paymentRepository
                .findById(UUID.fromString(data.get("id").asText()))
                .orElseThrow()
                .getAmountPaise())
        .isEqualTo(69900);
    assertThat(
            tenantSubscriptionRepository.findByTenantId(fx.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);
  }

  @Test
  void ac03_signedCallbackIsIdempotentAndBadSignatureDoesNotApply() throws Exception {
    Fixture fx = seed("cf-sig");
    Checkout checkout = startCheckout(fx.cookie(), "STARTER");
    String body = successPayload(checkout.orderId(), fx.tenantId(), "STARTER", "699.00");

    mockMvc
        .perform(
            post(CHECKOUT + "/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .header("x-webhook-timestamp", "1710000000")
                .header("x-webhook-signature", "not-a-signature")
                .content(body))
        .andExpect(status().isUnauthorized());
    assertThat(
            tenantSubscriptionRepository.findByTenantId(fx.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);

    mockMvc
        .perform(
            post(CHECKOUT + "/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signed(body))
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("accepted"));
    mockMvc
        .perform(
            post(CHECKOUT + "/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signed(body))
                .content(body))
        .andExpect(status().isOk());

    assertThat(
            tenantSubscriptionRepository.findByTenantId(fx.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.STARTER);
    assertThat(paymentRepository.findAll()).hasSize(1);
    assertThat(paymentRepository.findAll().get(0).getStatus())
        .isEqualTo(SubscriptionPaymentStatus.SUCCESS);
    assertThat(intentRepository.findAll()).hasSize(1);
  }

  @Test
  void ac04_onlySuccessfulProviderOutcomeActivatesAndHistoryIsKept() throws Exception {
    Fixture fx = seed("cf-act");
    Checkout checkout = startCheckout(fx.cookie(), "STARTER");
    mockMvc
        .perform(get(CHECKOUT + "/" + checkout.id()).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PENDING"));
    assertThat(
            tenantSubscriptionRepository.findByTenantId(fx.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);

    String drop = dropPayload(checkout.orderId(), fx.tenantId());
    mockMvc
        .perform(
            post(CHECKOUT + "/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signed(drop))
                .content(drop))
        .andExpect(status().isOk());
    assertThat(paymentRepository.findById(checkout.id()).orElseThrow().getStatus())
        .isEqualTo(SubscriptionPaymentStatus.ABANDONED);
    assertThat(
            tenantSubscriptionRepository.findByTenantId(fx.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);

    Checkout paid = startCheckout(fx.cookie(), "GROWTH");
    String ok = successPayload(paid.orderId(), fx.tenantId(), "GROWTH", "1499.00");
    mockMvc
        .perform(
            post(CHECKOUT + "/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signed(ok))
                .content(ok))
        .andExpect(status().isOk());
    assertThat(
            tenantSubscriptionRepository.findByTenantId(fx.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.GROWTH);
    assertThat(paymentRepository.findById(paid.id()).orElseThrow().getPayloadSnapshot())
        .isNotEmpty();
  }

  @Test
  void ac05_tamperReplayIsolationAndDeniedAreSafe() throws Exception {
    Fixture a = seed("cf-a");
    Fixture b = seed("cf-b");
    persistStaff(a.tenantId(), "clerk@cf-a.local");
    Cookie staff = login("clerk@cf-a.local");
    mockMvc
        .perform(
            post(CHECKOUT)
                .cookie(staff)
                .contentType(MediaType.APPLICATION_JSON)
                .content(checkoutBody("STARTER", UUID.randomUUID().toString())))
        .andExpect(status().isForbidden());

    persistUser(null, "ops@cf.local", AppUserRole.admin_super);
    Cookie master = login("ops@cf.local");

    Checkout checkout = startCheckout(a.cookie(), "STARTER");
    String tampered = successPayload(checkout.orderId(), a.tenantId(), "STARTER", "1.00");
    mockMvc
        .perform(
            post(CHECKOUT + "/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signed(tampered))
                .content(tampered))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CashfreeBillingPolicy.AMOUNT_MISMATCH));
    assertThat(
            tenantSubscriptionRepository.findByTenantId(a.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);
    assertThat(paymentRepository.findById(checkout.id()).orElseThrow().getStatus())
        .isEqualTo(SubscriptionPaymentStatus.FAILED);

    Checkout other = startCheckout(a.cookie(), "PRO");
    mockMvc
        .perform(get(CHECKOUT + "/" + other.id()).cookie(b.cookie()))
        .andExpect(status().isNotFound());
    String denied =
        mockMvc
            .perform(get(CHECKOUT + "/" + other.id()).cookie(b.cookie()))
            .andExpect(status().isNotFound())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(denied).doesNotContain(a.tenantId().toString());
    assertThat(
            tenantSubscriptionRepository.findByTenantId(b.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);

    String mismatch = successPayload(other.orderId(), b.tenantId(), "PRO", "2999.00");
    mockMvc
        .perform(
            post(CHECKOUT + "/callback")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(signed(mismatch))
                .content(mismatch))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CashfreeBillingPolicy.TENANT_MISMATCH));
    assertThat(
            tenantSubscriptionRepository.findByTenantId(a.tenantId()).orElseThrow().getPlanCode())
        .isEqualTo(PlanCode.FREE);

    mockMvc
        .perform(get("/api/v1/admin/subscriptions/payments").cookie(a.cookie()))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/admin/subscriptions/payments").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(2));
    assertThat(paymentRepository.findAll())
        .anyMatch(
            row ->
                row.getStatus() == SubscriptionPaymentStatus.FAILED
                    && row.getErrorCode().equals(CashfreeBillingPolicy.AMOUNT_MISMATCH));
  }

  @Test
  void ac05_paidUpgradeWithoutCheckoutIsRejected() throws Exception {
    Fixture fx = seed("cf-up");
    mockMvc
        .perform(
            post("/api/v1/subscriptions/upgrade")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(checkoutBody("STARTER", UUID.randomUUID().toString())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CashfreeBillingPolicy.PAYMENT_REQUIRED));
    mockMvc
        .perform(
            post("/api/v1/subscriptions/payment-callback")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"intentId\":\""
                        + UUID.randomUUID()
                        + "\",\"idempotencyKey\":\""
                        + UUID.randomUUID()
                        + "\"}"))
        .andExpect(status().isNotFound());
  }

  private Checkout startCheckout(Cookie cookie, String plan) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post(CHECKOUT)
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(checkoutBody(plan, UUID.randomUUID().toString())))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    return new Checkout(
        UUID.fromString(data.get("id").asText()), data.get("providerOrderId").asText());
  }

  private HttpHeaders signed(String body) throws Exception {
    String timestamp = "1710000000";
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String signature =
        Base64.getEncoder()
            .encodeToString(mac.doFinal((timestamp + body).getBytes(StandardCharsets.UTF_8)));
    HttpHeaders headers = new HttpHeaders();
    headers.add("x-webhook-timestamp", timestamp);
    headers.add("x-webhook-signature", signature);
    return headers;
  }

  private static String successPayload(String orderId, UUID tenantId, String plan, String amount) {
    return "{\"type\":\"PAYMENT_SUCCESS_WEBHOOK\",\"data\":{\"order\":{\"order_id\":\""
        + orderId
        + "\",\"order_amount\":"
        + amount
        + ",\"order_tags\":{\"tenant_id\":\""
        + tenantId
        + "\",\"plan_code\":\""
        + plan
        + "\"}},\"payment\":{\"cf_payment_id\":\"pay-1\",\"payment_status\":\"SUCCESS\"}}}";
  }

  private static String dropPayload(String orderId, UUID tenantId) {
    return "{\"type\":\"PAYMENT_USER_DROPPED_WEBHOOK\",\"data\":{\"order\":{\"order_id\":\""
        + orderId
        + "\",\"order_amount\":699.00,\"order_tags\":{\"tenant_id\":\""
        + tenantId
        + "\",\"plan_code\":\"STARTER\"}},\"payment\":{\"payment_status\":\"USER_DROPPED\"}}}";
  }

  private static String checkoutBody(String plan, String key) {
    return "{\"planCode\":\"" + plan + "\",\"idempotencyKey\":\"" + key + "\"}";
  }

  private Fixture seed(String slug) {
    Tenant tenant = persistTenant(slug, slug + " Chemist", TenantStatus.ACTIVE);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistOwner(tenant.getId(), "owner@" + slug + ".local");
    return new Fixture(tenant.getId(), login("owner@" + slug + ".local"));
  }

  private Tenant persistTenant(String slug, String name, TenantStatus status) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug + "-" + tenant.getId().toString().substring(0, 8));
    tenant.setName(name);
    tenant.setStatus(status);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
  }

  private void persistPlan(UUID tenantId, PlanCode planCode) {
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(planCode);
    subscription.setStatus(SubscriptionStatus.ACTIVE);
    subscription.setStartedAt(T0);
    subscription.setCreatedAt(T0);
    subscription.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(subscription);
  }

  private AppUser persistOwner(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_owner);
  }

  private AppUser persistStaff(UUID tenantId, String email) {
    return persistUser(tenantId, email, AppUserRole.pharmacy_staff);
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

  private Cookie login(String email) {
    try {
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
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  private record Fixture(UUID tenantId, Cookie cookie) {}

  private record Checkout(UUID id, String orderId) {}
}
