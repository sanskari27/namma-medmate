package com.nammamedmate.server.feature.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoicePaymentRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class SalesInvoicePaymentTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T06:00:00Z");
  private static final long TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoicePaymentRepository salesInvoicePaymentRepository;
  @Autowired private CustomerCreditAccountRepository accountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository ledgerRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_modesAreCashCardUpiCreditAndBankTransfer() throws Exception {
    Fixture fx = seed("pay-ac01");
    Stocked product = stocked(fx, "PAY-1", "Pay Pack");
    UUID customerId = createCustomer(fx.cookie(), "Khata One", "9401000001");
    setLimit(fx.cookie(), customerId, 50000, 0);
    UUID invoiceId = createDraft(fx, product, customerId, "pay-1");

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
                        "complete-1",
                        """
                        {"mode":"CASH","amountPaise":2000},
                        {"mode":"CARD","amountPaise":2000,"reference":"RRN-1"},
                        {"mode":"UPI","amountPaise":2000,"reference":"UPI-1"},
                        {"mode":"BANK_TRANSFER","amountPaise":2000,"reference":"NEFT-1"},
                        {"mode":"CREDIT","amountPaise":3200}
                        """)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("COMPLETED"))
        .andExpect(jsonPath("$.data.payments", hasSize(5)))
        .andExpect(jsonPath("$.data.payments[0].mode").value("CASH"))
        .andExpect(jsonPath("$.data.payments[1].mode").value("CARD"))
        .andExpect(jsonPath("$.data.payments[2].mode").value("UPI"))
        .andExpect(jsonPath("$.data.payments[3].mode").value("BANK_TRANSFER"))
        .andExpect(jsonPath("$.data.payments[4].mode").value("CREDIT"))
        .andExpect(jsonPath("$.data.payments[1].reference").value("RRN-1"));

    assertThat(
            salesInvoicePaymentRepository
                .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                    invoiceId, fx.tenantId(), fx.branchId()))
        .hasSize(5);
  }

  @Test
  void ac02_partsEqualAmountPaidAndDueAndChange() throws Exception {
    Fixture fx = seed("pay-ac02");
    Stocked product = stocked(fx, "PAY-2", "Change Pack");
    UUID cashId = createDraft(fx, product, null, "pay-2a");
    UUID mixedId =
        createDraft(fx, product, createCustomer(fx.cookie(), "Split", "9401000002"), "pay-2b");
    setLimit(
        fx.cookie(),
        salesInvoiceRepository.findById(mixedId).orElseThrow().getCustomerId(),
        50000,
        0);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + cashId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 800, "complete-2a", "{\"mode\":\"CASH\",\"amountPaise\":12000}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.amountPaidPaise").value(12000))
        .andExpect(jsonPath("$.data.amountDuePaise").value(0))
        .andExpect(jsonPath("$.data.changePaise").value(800));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + mixedId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1,
                        TOTAL,
                        0,
                        "complete-2b",
                        """
                        {"mode":"CASH","amountPaise":5000},
                        {"mode":"UPI","amountPaise":3000,"reference":"UPI-9"},
                        {"mode":"CREDIT","amountPaise":3200}
                        """)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.amountPaidPaise").value(11200))
        .andExpect(jsonPath("$.data.amountDuePaise").value(3200))
        .andExpect(jsonPath("$.data.changePaise").value(0));
  }

  @Test
  void ac03_posPaymentIsManuallyMarkedWithoutGateway() throws Exception {
    Fixture fx = seed("pay-ac03");
    Stocked product = stocked(fx, "PAY-3", "Card Pack");
    UUID invoiceId = createDraft(fx, product, null, "pay-3");

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
                        "complete-3",
                        "{\"mode\":\"CARD\",\"amountPaise\":11200,\"reference\":\"SWIPE-44\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.payments", hasSize(1)))
        .andExpect(jsonPath("$.data.payments[0].mode").value("CARD"))
        .andExpect(jsonPath("$.data.payments[0].reference").value("SWIPE-44"))
        .andExpect(jsonPath("$.data.payments[0].gateway").doesNotExist())
        .andExpect(jsonPath("$.data.payments[0].paymentIntentId").doesNotExist());

    assertThat(
            salesInvoicePaymentRepository
                .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                    invoiceId, fx.tenantId(), fx.branchId())
                .get(0)
                .getReference())
        .isEqualTo("SWIPE-44");
  }

  @Test
  void ac04_khataConsumesApprovedCreditAtomically() throws Exception {
    Fixture fx = seed("pay-ac04");
    Stocked product = stocked(fx, "PAY-4", "Khata Pack");
    UUID customerId = createCustomer(fx.cookie(), "Khata Buyer", "9401000004");
    setLimit(fx.cookie(), customerId, 50000, 0);
    UUID invoiceId = createDraft(fx, product, customerId, "pay-4");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "complete-4", "{\"mode\":\"CREDIT\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"))
        .andExpect(jsonPath("$.data.amountDuePaise").value(11200));

    assertThat(accountRepository.findByTenantIdAndCustomerId(fx.tenantId(), customerId))
        .get()
        .extracting(account -> account.getBalancePaise())
        .isEqualTo(11200L);
    assertThat(
            ledgerRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .filteredOn(entry -> entry.getType() == CustomerCreditLedgerType.SALE_CHARGE)
        .hasSize(1)
        .first()
        .satisfies(
            entry -> {
              assertThat(entry.getAmountPaise()).isEqualTo(11200L);
              assertThat(entry.getInvoiceId()).isEqualTo(invoiceId);
            });
    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("SALES_INVOICE_COMPLETE");
  }

  @Test
  void ac05_underOverInvalidChangeInsufficientCreditDuplicateStaleAndIsolationFail()
      throws Exception {
    Fixture fx = seed("pay-ac05");
    Stocked product = stocked(fx, "PAY-5", "Fail Pack");
    UUID walkInId = createDraft(fx, product, null, "pay-5a");
    UUID customerId = createCustomer(fx.cookie(), "Tight Limit", "9401000005");
    setLimit(fx.cookie(), customerId, 5000, 0);
    UUID khataId = createDraft(fx, product, customerId, "pay-5b");
    UUID cashId = createDraft(fx, product, null, "pay-5c");

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkInId + "/complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "no-auth", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkInId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "under-1", "{\"mode\":\"CASH\",\"amountPaise\":5000}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNDER_ALLOCATION"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkInId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "over-1", "{\"mode\":\"UPI\",\"amountPaise\":15000}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_ALLOCATION"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkInId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 800, "chg-1", "{\"mode\":\"UPI\",\"amountPaise\":12000}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_CHANGE"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkInId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "walk-khata", "{\"mode\":\"CREDIT\",\"amountPaise\":11200}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("KHATA_REQUIRES_CUSTOMER"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + khataId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "over-limit", "{\"mode\":\"CREDIT\",\"amountPaise\":11200}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"));
    assertThat(accountRepository.findByTenantIdAndCustomerId(fx.tenantId(), customerId))
        .get()
        .extracting(account -> account.getBalancePaise())
        .isEqualTo(0L);
    assertThat(salesInvoiceRepository.findById(khataId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.DRAFT);

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + cashId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        99, TOTAL, 0, "stale-ver", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + cashId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, 9999, 0, "stale-tot", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + cashId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "dup-ok", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + cashId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        2, TOTAL, 0, "dup-ok", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + cashId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        2, TOTAL, 0, "dup-other", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_COMPLETION"));

    mockMvc
        .perform(
            patch("/api/v1/sales/invoices/" + cashId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(product, 2)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    AppUser inventory =
        persistUser(fx.tenantId(), "stock@pay-ac05.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(fx.cookie(), "Stock desk", "[\"INVENTORY\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + inventory.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + invRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + inventory.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie invCookie = login("stock@pay-ac05.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkInId + "/complete")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "denied", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isForbidden());

    Tenant other = persistTenant("other-pay", "Other Pay");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-pay.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-pay.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + otherBranch.getId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + walkInId + "/complete")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "x-tenant", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/sales/invoices/" + cashId).cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    assertThat(salesInvoiceRepository.findById(walkInId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.DRAFT);
  }

  @Test
  void ac04_salesCashierCanChargeKhataWithoutCrmModule() throws Exception {
    Fixture fx = seed("pay-till");
    Stocked product = stocked(fx, "PAY-T", "Till Khata");
    UUID customerId = createCustomer(fx.cookie(), "Till Patient", "9401000006");
    setLimit(fx.cookie(), customerId, 20000, 0);
    UUID invoiceId = createDraft(fx, product, customerId, "pay-t");

    AppUser cashier = persistUser(fx.tenantId(), "till@pay-till.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till desk", "[\"SALES\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + cashier.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + cashier.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie tillCookie = login("till@pay-till.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(tillCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(tillCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "till-khata", "{\"mode\":\"CREDIT\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
  }

  private UUID createDraft(Fixture fx, Stocked product, UUID customerId, String key)
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
                            "quantity":1,
                            "unit":"Tablet",
                            "mrpPaise":12000,
                            "sellingPricePaise":10000,
                            "discountPaise":0
                          }]
                        }
                        """
                            .formatted(customer, key, product.productId(), product.batchId())))
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
    Tenant tenant = persistTenant(tag, "Pay " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
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
    return new Fixture(tenant.getId(), branch.getId(), owner.getId(), cookie);
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
      int version, long expectedTotal, long change, String key, String payments) {
    return """
        {
          "expectedVersion":%d,
          "expectedTotalPaise":%d,
          "changePaise":%d,
          "idempotencyKey":"%s",
          "payments":[%s]
        }
        """
        .formatted(version, expectedTotal, change, key, payments);
  }

  private static String patchJson(Stocked product, int expectedVersion) {
    return """
        {
          "expectedVersion":%d,
          "customerId":null,
          "doctorId":null,
          "prescriptionReference":null,
          "prescriptionVerified":false,
          "lines":[{
            "productId":"%s",
            "batchId":"%s",
            "quantity":1,
            "unit":"Tablet",
            "mrpPaise":12000,
            "sellingPricePaise":10000,
            "discountPaise":0
          }]
        }
        """
        .formatted(expectedVersion, product.productId(), product.batchId());
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

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
