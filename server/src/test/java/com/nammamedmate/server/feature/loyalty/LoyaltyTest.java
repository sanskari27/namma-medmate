package com.nammamedmate.server.feature.loyalty;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.LoyaltyLedgerType;
import com.nammamedmate.server.domain.LoyaltyPolicy;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyAccountRepository;
import com.nammamedmate.server.persistence.CustomerLoyaltyLedgerEntryRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class LoyaltyTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T12:00:00Z");
  private static final long TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private CustomerLoyaltyAccountRepository accountRepository;
  @Autowired private CustomerLoyaltyLedgerEntryRepository ledgerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_cashSaleAwardsNearestPointsOnce() throws Exception {
    Fixture fx = seed("loy-ac01");
    Stocked product = stocked(fx, "LOY-1", "Earn Pack");
    UUID customerId = createCustomer(fx.cookie(), "Point Patient", "9601000001");
    UUID invoiceId = createDraft(fx, product, customerId, 1, "loy-1");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-cash-1", 0, "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loyaltyEarnedPoints").value(1))
        .andExpect(jsonPath("$.data.loyaltyRedeemPoints").value(0));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.balancePoints").value(1))
        .andExpect(jsonPath("$.data.entries[?(@.type=='EARN')]", hasSize(1)))
        .andExpect(jsonPath("$.data.entries[?(@.type=='EARN')].points").value(1))
        .andExpect(
            jsonPath("$.data.entries[?(@.type=='EARN')].invoiceId").value(invoiceId.toString()));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        2, TOTAL, 0, "loy-cash-1", 0, "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loyaltyEarnedPoints").value(1));

    assertThat(
            ledgerRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .filteredOn(entry -> entry.getType() == LoyaltyLedgerType.EARN)
        .hasSize(1);
  }

  @Test
  void ac01_khataEarnsOnlyAfterSettlement() throws Exception {
    Fixture fx = seed("loy-khata");
    Stocked product = stocked(fx, "LOY-K", "Khata Pack");
    UUID customerId = createCustomer(fx.cookie(), "Khata Points", "9601000002");
    setLimit(fx.cookie(), customerId, 50000, 0);
    UUID invoiceId = createDraft(fx, product, customerId, 1, "loy-k");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1,
                        TOTAL,
                        0,
                        "loy-khata-1",
                        0,
                        "{\"mode\":\"CREDIT\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loyaltyEarnedPoints").value(0))
        .andExpect(jsonPath("$.data.loyaltyPendingTaxablePaise").value(10000));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePoints").value(0))
        .andExpect(jsonPath("$.data.entries", hasSize(0)));

    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/credit/settlements")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"amountPaise\":11200,\"mode\":\"CASH\",\"idempotencyKey\":\"loy-settle-1\",\"expectedVersion\":2}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePoints").value(1))
        .andExpect(jsonPath("$.data.entries[?(@.type=='SETTLEMENT_EARN')]", hasSize(1)));
    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getLoyaltyEarnedPoints())
        .isEqualTo(1L);
    assertThat(
            salesInvoiceRepository
                .findById(invoiceId)
                .orElseThrow()
                .getLoyaltyPendingTaxablePaise())
        .isEqualTo(0L);
  }

  @Test
  void ac02_redeemDebitsLedgerAndReducesCollectible() throws Exception {
    Fixture fx = seed("loy-ac02");
    Stocked product = stocked(fx, "LOY-2", "Redeem Pack");
    UUID customerId = createCustomer(fx.cookie(), "Redeemer", "9601000003");
    adjust(fx.cookie(), customerId, 20, "Seed till points", "adj-20", 0);

    UUID invoiceId = createDraft(fx, product, customerId, 1, "loy-2");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1,
                        TOTAL,
                        0,
                        "loy-redeem-1",
                        10,
                        "{\"mode\":\"CASH\",\"amountPaise\":10200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loyaltyRedeemPoints").value(10))
        .andExpect(jsonPath("$.data.loyaltyRedeemPaise").value(1000))
        .andExpect(jsonPath("$.data.loyaltyEarnedPoints").value(1))
        .andExpect(jsonPath("$.data.amountPaidPaise").value(10200))
        .andExpect(jsonPath("$.data.totalPaise").value(11200));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePoints").value(11))
        .andExpect(jsonPath("$.data.entries[?(@.type=='REDEEM')]", hasSize(1)))
        .andExpect(jsonPath("$.data.entries[?(@.type=='REDEEM')].points").value(10));
  }

  @Test
  void ac03_returnReversesEarnedAndRedeemedWithoutRewritingHistory() throws Exception {
    Fixture fx = seed("loy-ac03");
    Stocked product = stocked(fx, "LOY-3", "Return Pack");
    UUID customerId = createCustomer(fx.cookie(), "Return Points", "9601000004");
    adjust(fx.cookie(), customerId, 10, "Seed", "adj-ret", 0);
    UUID invoiceId = createDraft(fx, product, customerId, 2, "loy-3");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1,
                        TOTAL * 2,
                        0,
                        "loy-ret-sale",
                        10,
                        "{\"mode\":\"CASH\",\"amountPaise\":21400}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loyaltyEarnedPoints").value(2))
        .andExpect(jsonPath("$.data.loyaltyRedeemPoints").value(10));

    UUID lineId = lineId(fx, invoiceId);
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Half back", "loy-sr-1")))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.entries[?(@.type=='RETURN_EARN')]", hasSize(1)))
        .andExpect(jsonPath("$.data.entries[?(@.type=='RETURN_REDEEM')]", hasSize(1)))
        .andExpect(jsonPath("$.data.entries[?(@.type=='EARN')]", hasSize(1)))
        .andExpect(jsonPath("$.data.entries[?(@.type=='REDEEM')]", hasSize(1)))
        .andExpect(jsonPath("$.data.balancePoints").value(6));

    assertThat(
            ledgerRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .filteredOn(entry -> entry.getType() == LoyaltyLedgerType.EARN)
        .first()
        .extracting(entry -> entry.getPoints())
        .isEqualTo(2L);
  }

  @Test
  void ac03_downgradeFreezesEarnAndRedeemAndKeepsBalance() throws Exception {
    Fixture fx = seed("loy-down");
    Stocked product = stocked(fx, "LOY-D", "Freeze Pack");
    UUID customerId = createCustomer(fx.cookie(), "Frozen", "9601000005");
    UUID first = createDraft(fx, product, customerId, 1, "loy-d1");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + first + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-down-1", 0, "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/subscriptions/upgrade")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"planCode\":\"STARTER\",\"idempotencyKey\":\"loy-down-plan\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.planCode").value("STARTER"));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePoints").value(1));

    Stocked later = stocked(fx, "LOY-D2", "Frozen Sale");
    UUID redeemFrozen = createDraft(fx, later, customerId, 1, "loy-d2");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + redeemFrozen + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-down-r", 1, "{\"mode\":\"CASH\",\"amountPaise\":11100}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(LoyaltyPolicy.PLAN_LIMIT));

    UUID second = createDraft(fx, later, customerId, 1, "loy-d3");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + second + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-down-2", 0, "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loyaltyEarnedPoints").value(0));

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePoints").value(1));
  }

  @Test
  void ac04_planDeniedInsufficientAndConcurrentNeverGoNegative() throws Exception {
    Fixture free = seedPlan("loy-free", PlanCode.FREE);
    Stocked freeProduct = stocked(free, "LOY-F", "Free Pack");
    UUID freeCustomer = createCustomer(free.cookie(), "Free Patient", "9601000006");
    UUID freeInvoice = createDraft(free, freeProduct, freeCustomer, 1, "loy-free-1");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + freeInvoice + "/complete")
                .cookie(free.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-free-c", 0, "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.loyaltyEarnedPoints").value(0));
    UUID freeRedeem = createDraft(free, freeProduct, freeCustomer, 1, "loy-free-2");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + freeRedeem + "/complete")
                .cookie(free.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-free-r", 1, "{\"mode\":\"CASH\",\"amountPaise\":11100}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(LoyaltyPolicy.PLAN_LIMIT));

    Fixture fx = seed("loy-race");
    Stocked product = stocked(fx, "LOY-R", "Race Pack");
    UUID customerId = createCustomer(fx.cookie(), "Racer", "9601000007");
    adjust(fx.cookie(), customerId, 10, "Race seed", "adj-race", 0);
    UUID walkIn = createDraft(fx, product, null, 1, "loy-walk");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkIn + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-walk-r", 1, "{\"mode\":\"CASH\",\"amountPaise\":11100}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(LoyaltyPolicy.LOYALTY_REQUIRES_CUSTOMER));

    UUID low = createDraft(fx, product, customerId, 1, "loy-low");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + low + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-low-r", 11, "{\"mode\":\"CASH\",\"amountPaise\":10100}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(LoyaltyPolicy.INSUFFICIENT_POINTS));

    UUID overCap = createDraft(fx, product, customerId, 1, "loy-cap");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + overCap + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "loy-cap-r", 23, "{\"mode\":\"CASH\",\"amountPaise\":8900}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(LoyaltyPolicy.REDEEM_LIMIT));

    Stocked a = stocked(fx, "LOY-RA", "Race A");
    Stocked b = stocked(fx, "LOY-RB", "Race B");
    UUID invoiceA = createDraft(fx, a, customerId, 1, "loy-ra");
    UUID invoiceB = createDraft(fx, b, customerId, 1, "loy-rb");
    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<Integer>> results = new ArrayList<>();
    try {
      results.add(pool.submit(() -> completeStatus(fx.cookie(), invoiceA, "loy-race-a", start)));
      results.add(pool.submit(() -> completeStatus(fx.cookie(), invoiceB, "loy-race-b", start)));
      start.countDown();
      List<Integer> codes = new ArrayList<>();
      for (Future<Integer> result : results) {
        codes.add(result.get(20, TimeUnit.SECONDS));
      }
      assertThat(codes).contains(200);
      assertThat(codes.stream().filter(code -> code == 422).count()).isEqualTo(1);
    } finally {
      pool.shutdownNow();
    }
    assertThat(accountRepository.findByTenantIdAndCustomerId(fx.tenantId(), customerId))
        .get()
        .satisfies(account -> assertThat(account.getBalancePoints()).isGreaterThanOrEqualTo(0L));
  }

  @Test
  void ac04_crossTenantAndStaffAdjustAreDenied() throws Exception {
    Fixture fx = seed("loy-iso");
    UUID customerId = createCustomer(fx.cookie(), "Home", "9601000008");
    adjust(fx.cookie(), customerId, 5, "Home seed", "adj-iso", 0);

    Fixture other = seed("loy-other");
    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/loyalty").cookie(other.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    AppUser staff = persistUser(fx.tenantId(), "staff@loy-iso.local", AppUserRole.pharmacy_staff);
    UUID crmRole = createRole(fx.cookie(), "CRM till", "[\"CRM\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + crmRole + "\"]}"))
        .andExpect(status().isOk());
    Cookie staffCookie = login("staff@loy-iso.local");
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/loyalty/adjustments")
                .cookie(staffCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"points\":1,\"reason\":\"Staff tweak\",\"idempotencyKey\":\"staff-adj\",\"expectedVersion\":1}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  private int completeStatus(Cookie cookie, UUID invoiceId, String key, CountDownLatch start)
      throws Exception {
    start.await();
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        completeJson(
                            1, TOTAL, 0, key, 10, "{\"mode\":\"CASH\",\"amountPaise\":10200}")))
            .andReturn();
    return result.getResponse().getStatus();
  }

  private void adjust(
      Cookie cookie, UUID customerId, long points, String reason, String key, long version)
      throws Exception {
    mockMvc
        .perform(
            post("/api/v1/customers/" + customerId + "/loyalty/adjustments")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"points\":%d,\"reason\":\"%s\",\"idempotencyKey\":\"%s\",\"expectedVersion\":%d}"
                        .formatted(points, reason, key, version)))
        .andExpect(status().isOk());
  }

  private UUID lineId(Fixture fx, UUID invoiceId) {
    return salesInvoiceLineRepository
        .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoiceId, fx.tenantId(), fx.branchId())
        .get(0)
        .getId();
  }

  private static String returnJson(
      UUID invoiceId, UUID lineId, String quantity, String refundMode, String reason, String key) {
    return """
        {
          "salesInvoiceId":"%s",
          "reason":"%s",
          "decision":"APPROVED",
          "refundMode":"%s",
          "idempotencyKey":"%s",
          "lines":[{"salesInvoiceLineId":"%s","quantity":%s}]
        }
        """
        .formatted(invoiceId, reason, refundMode, key, lineId, quantity);
  }

  private UUID createDraft(Fixture fx, Stocked product, UUID customerId, int quantity, String key)
      throws Exception {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "customerId":%s,
                          "doctorId":null,
                          "prescriptionReference":null,
                          "prescriptionVerified":false,
                          "idempotencyKey":"%s",
                          "lines":[{
                            "productId":"%s",
                            "batchId":"%s",
                            "quantity":%d,
                            "unit":"Tablet",
                            "mrpPaise":12000,
                            "sellingPricePaise":10000,
                            "discountPaise":0
                          }]
                        }
                        """
                            .formatted(
                                customer, key, product.productId(), product.batchId(), quantity)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private void setLimit(Cookie cookie, UUID customerId, long limitPaise, long expectedVersion)
      throws Exception {
    mockMvc
        .perform(
            put("/api/v1/customers/" + customerId + "/credit/limit")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"limitPaise\":%d,\"expectedVersion\":%d}"
                        .formatted(limitPaise, expectedVersion)))
        .andExpect(status().isOk());
  }

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"%s\",\"phone\":\"%s\"}".formatted(name, phone)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private Stocked stocked(Fixture fx, String sku, String name) throws Exception {
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"" + sku + " cat\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/products")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(productJson(sku, name, categoryId)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-AA\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku)))
        .andExpect(status().isOk());
    String body =
        mockMvc
            .perform(
                get("/api/v1/inventory/products/" + productId + "/batches").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID batchId =
        UUID.fromString(
            objectMapper.readTree(body).path("data").path("items").get(0).path("batchId").asText());
    return new Stocked(productId, batchId);
  }

  private Fixture seed(String tag) throws Exception {
    return seedPlan(tag, PlanCode.GROWTH);
  }

  private Fixture seedPlan(String tag, PlanCode plan) throws Exception {
    Tenant tenant = persistTenant(tag, "Loy " + tag);
    persistPlan(tenant.getId(), plan);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branch.getId() + "\"}"))
        .andExpect(status().isOk());
    return new Fixture(tenant.getId(), branch.getId(), cookie);
  }

  private Location persistBranch(UUID tenantId, String name, String code, boolean defaultBranch) {
    Location branch = new Location();
    branch.setId(UUID.randomUUID());
    branch.setTenantId(tenantId);
    branch.setName(name);
    branch.setBranchCode(code);
    branch.setAddressLine("12 MG Road");
    branch.setCity("Bengaluru");
    branch.setState("KA");
    branch.setPincode("560001");
    branch.setContactPhone("9876543210");
    branch.setDrugLicenseNumber("DL-" + code);
    branch.setGstin("29ABCDE1234F1Z5");
    Map<String, Object> hours = new LinkedHashMap<>();
    Map<String, Object> mon = new LinkedHashMap<>();
    mon.put("open", "09:00");
    mon.put("close", "21:00");
    hours.put("mon", mon);
    branch.setOperatingHours(hours);
    branch.setBranchType(BranchType.RETAIL);
    branch.setStatus(BranchStatus.ACTIVE);
    branch.setOpeningDate(LocalDate.of(2026, 9, 1));
    branch.setDefaultBranch(defaultBranch);
    branch.setLinkedWarehouse(false);
    branch.setPricingSettings(Map.of("defaultMarkupBps", 0));
    branch.setTaxSettings(Map.of("gstMode", "CGST_SGST", "taxState", "KA"));
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
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

  private Cookie login(String email) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    Cookie access = result.getResponse().getCookie("nmm_access");
    assertThat(access).isNotNull();
    return access;
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

  private static String completeJson(
      int version, long expectedTotal, long change, String key, int redeemPoints, String payments) {
    return """
        {
          "expectedVersion":%d,
          "expectedTotalPaise":%d,
          "changePaise":%d,
          "idempotencyKey":"%s",
          "redeemPoints":%d,
          "payments":[%s]
        }
        """
        .formatted(version, expectedTotal, change, key, redeemPoints, payments);
  }

  private static String productJson(String sku, String name, UUID categoryId) {
    return """
        {
          "sku":"%s",
          "barcode":null,
          "name":"%s",
          "genericName":null,
          "brandName":null,
          "manufacturerId":null,
          "categoryId":"%s",
          "productType":"Medicine",
          "dosageForm":"Tablet",
          "therapeuticClass":null,
          "composition":null,
          "strength":null,
          "route":null,
          "prescriptionRequired":false,
          "scheduleClassification":null,
          "hsnCode":"30049099",
          "gstRate":12,
          "baseUnit":"Tablet",
          "packSize":10,
          "packUnit":"strip",
          "packDescription":null,
          "storageConditions":null,
          "requiresColdStorage":false,
          "rackLocation":null,
          "reorderLevel":null,
          "reorderQuantity":null,
          "minimumStock":null,
          "isDiscontinued":false,
          "isReturnable":true,
          "isTaxable":true,
          "taxCategory":"GST-12",
          "requiresBatchTracking":true,
          "requiresExpiryTracking":true,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
