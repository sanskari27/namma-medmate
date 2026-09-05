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
import com.nammamedmate.server.domain.CustomerHistoryFactType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerHistoryFactRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
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

class SalesInvoiceHoldTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T08:00:00Z");
  private static final long TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private CustomerHistoryFactRepository historyFactRepository;
  @Autowired private CustomerCreditLedgerEntryRepository ledgerRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_holdReservesNoStockAndListsHeldBills() throws Exception {
    Fixture fx = seed("hold-ac01");
    Stocked product = stocked(fx, "HLD-1", "Hold Pack");
    UUID invoiceId = createDraft(fx, product, null, null, false, "hold-1");

    BigDecimal before =
        stockBalanceRepository
            .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                fx.tenantId(), fx.branchId(), product.productId(), product.batchId())
            .orElseThrow()
            .getQuantity();

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/hold")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("HELD"))
        .andExpect(jsonPath("$.data.version").value(2));

    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    fx.tenantId(), fx.branchId(), product.productId(), product.batchId())
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo(before);
    assertThat(
            stockMovementRepository.findFiltered(
                fx.tenantId(), fx.branchId(), product.productId(), product.batchId()))
        .noneMatch(row -> row.getType() == StockMovementType.STOCK_OUT);
    assertThat(salesInvoiceRepository.findById(invoiceId).orElseThrow().getStatus())
        .isEqualTo(SalesInvoiceStatus.HELD);

    mockMvc
        .perform(get("/api/v1/sales/invoices?status=HELD").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(invoiceId.toString()))
        .andExpect(jsonPath("$.data.items[0].status").value("HELD"));
  }

  @Test
  void ac02_resumeRecalculatesStockExpiryPriceTaxAndApprovals() throws Exception {
    Fixture fx = seed("hold-ac02");
    Stocked product = stocked(fx, "HLD-2", "Resume Pack");
    UUID invoiceId = createDraft(fx, product, null, null, false, "hold-2");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/hold")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            patch("/api/v1/products/" + product.productId())
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(productJson("HLD-2", "Resume Pack", product.categoryId(), "18")))
        .andExpect(status().isOk());
    StockBatch batch = stockBatchRepository.findById(product.batchId()).orElseThrow();
    batch.setExpiresOn(LocalDate.of(2026, 12, 1));
    stockBatchRepository.saveAndFlush(batch);
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchId\":\"%s\",\"quantity\":\"10\",\"idempotencyKey\":\"deplete-2\",\"expectedVersion\":1}"
                        .formatted(product.productId(), product.batchId())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"moduleCode":"SALES","actionKey":"SALES_DISCOUNT_PERCENT","thresholdValue":1,"approverType":"ACCOUNT_CLASS","approverAccountClass":"pharmacy_owner","allowSelfApproval":true}
                    """))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/resume")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("DRAFT"))
        .andExpect(jsonPath("$.data.lines[0].gstRate").value(18))
        .andExpect(jsonPath("$.data.lines[0].expiresOn").value("2026-12-01"))
        .andExpect(jsonPath("$.data.revalidation.stock").value(true))
        .andExpect(jsonPath("$.data.revalidation.expiry").value(true))
        .andExpect(jsonPath("$.data.revalidation.price").value(true))
        .andExpect(jsonPath("$.data.revalidation.tax").value(true));
  }

  @Test
  void ac03_completeFromHoldPostsStockPaymentsCreditAndAudit() throws Exception {
    Fixture fx = seed("hold-ac03");
    Stocked product = stocked(fx, "HLD-3", "Collect Pack");
    UUID customerId = createCustomer(fx.cookie(), "Held Patient", "9501000003");
    setLimit(fx.cookie(), customerId, 50000, 0);
    UUID invoiceId = createDraft(fx, product, customerId, null, false, "hold-3");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/hold")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        2,
                        TOTAL,
                        0,
                        "complete-hold-3",
                        """
                        {"mode":"CASH","amountPaise":8000},
                        {"mode":"CREDIT","amountPaise":3200}
                        """)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"))
        .andExpect(jsonPath("$.data.amountPaidPaise").value(11200))
        .andExpect(jsonPath("$.data.amountDuePaise").value(3200));

    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    fx.tenantId(), fx.branchId(), product.productId(), product.batchId())
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo("9");
    assertThat(
            stockMovementRepository.findByTenantIdAndIdempotencyKey(
                fx.tenantId(), "sale:" + invoiceId + ":" + lineId(fx, invoiceId)))
        .get()
        .extracting(row -> row.getType())
        .isEqualTo(StockMovementType.STOCK_OUT);
    assertThat(
            ledgerRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .filteredOn(entry -> entry.getType() == CustomerCreditLedgerType.SALE_CHARGE)
        .hasSize(1);
    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("SALES_INVOICE_COMPLETE");
  }

  @Test
  void ac04_customerHistoryFactsPostOnceForPurchaseAndPrescription() throws Exception {
    Fixture fx = seed("hold-ac04");
    Stocked product = stocked(fx, "HLD-4", "History Pack");
    UUID customerId = createCustomer(fx.cookie(), "History Patient", "9501000004");
    UUID doctorId = createDoctor(fx.cookie(), "Dr Rao", "KA-DR-4");
    UUID walkInId = createDraft(fx, product, null, null, false, "hold-4w");
    UUID purchaseId = createDraft(fx, product, customerId, null, false, "hold-4p");
    UUID rxId = createDraft(fx, product, customerId, doctorId, true, "hold-4r");

    completeCash(fx, walkInId, 1, "complete-4w");
    completeCash(fx, purchaseId, 1, "complete-4p");
    completeCash(fx, rxId, 1, "complete-4r");
    completeCash(fx, purchaseId, 2, "complete-4p");

    mockMvc
        .perform(get("/api/v1/customers/" + customerId + "/history").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[?(@.invoiceId=='" + purchaseId + "')]", hasSize(1)))
        .andExpect(jsonPath("$.data.items[?(@.invoiceId=='" + rxId + "')]", hasSize(2)));

    assertThat(
            historyFactRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .filteredOn(fact -> purchaseId.equals(fact.getInvoiceId()))
        .hasSize(1)
        .first()
        .extracting(fact -> fact.getType())
        .isEqualTo(CustomerHistoryFactType.PURCHASE);
    assertThat(
            historyFactRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .filteredOn(fact -> rxId.equals(fact.getInvoiceId()))
        .extracting(fact -> fact.getType())
        .containsExactlyInAnyOrder(
            CustomerHistoryFactType.PURCHASE, CustomerHistoryFactType.PRESCRIPTION);
    assertThat(
            historyFactRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .noneMatch(fact -> walkInId.equals(fact.getInvoiceId()));
  }

  @Test
  void ac06_twoTerminalsDepletedStockStaleApprovalReplayAndIsolationFail() throws Exception {
    Fixture fx = seed("hold-ac06");
    Stocked product = stocked(fx, "HLD-6", "Race Pack");
    UUID heldId = createDraft(fx, product, null, null, false, "hold-6a");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + heldId + "/hold")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + heldId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        2, TOTAL, 0, "race-1", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + heldId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        2, TOTAL, 0, "race-1", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + heldId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        2, TOTAL, 0, "race-2", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_COMPLETION"));

    Stocked scarce = stocked(fx, "HLD-6E", "Empty Pack");
    UUID emptyId = createDraft(fx, scarce, null, null, false, "hold-6b");
    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"productId\":\"%s\",\"batchId\":\"%s\",\"quantity\":\"10\",\"idempotencyKey\":\"empty-6\",\"expectedVersion\":1}"
                        .formatted(scarce.productId(), scarce.batchId())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + emptyId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "empty-6", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STOCK"));

    UUID pendingId = createDraft(fx, product, null, null, false, "hold-6c");
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"moduleCode":"SALES","actionKey":"SALES_DISCOUNT_PERCENT","thresholdValue":5,"approverType":"ACCOUNT_CLASS","approverAccountClass":"pharmacy_owner","allowSelfApproval":true}
                    """))
        .andExpect(status().isOk());
    MvcResult priced =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices/" + pendingId + "/pricing")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"expectedVersion":1,"billDiscountType":"PERCENT","billDiscountValue":1500,"lines":[]}
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.discountApprovalStatus").value("PENDING"))
            .andReturn();
    long pendingTotal =
        objectMapper
            .readTree(priced.getResponse().getContentAsString())
            .path("data")
            .path("totalPaise")
            .asLong();
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + pendingId + "/hold")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":2}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            patch("/api/v1/sales/invoices/" + pendingId)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(patchJson(product, 3)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + pendingId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        3,
                        pendingTotal,
                        0,
                        "pending-6",
                        "{\"mode\":\"CASH\",\"amountPaise\":" + pendingTotal + "}")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("APPROVAL_REQUIRED"));

    AppUser cashier =
        persistUser(fx.tenantId(), "till@hold-ac06.local", AppUserRole.pharmacy_staff);
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
    Cookie tillCookie = login("till@hold-ac06.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(tillCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    UUID tillId = createDraft(fx, product, null, null, false, "hold-6t");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + tillId + "/complete")
                .cookie(tillCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        1, TOTAL, 0, "till-6", "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));

    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + heldId + "/hold")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isUnauthorized());
    AppUser invOnly = persistUser(fx.tenantId(), "inv@hold-ac06.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(fx.cookie(), "Store", "[\"INVENTORY\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + invOnly.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + invRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + invOnly.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie invCookie = login("inv@hold-ac06.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + emptyId + "/hold")
                .cookie(invCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isForbidden());

    Tenant other = persistTenant("other-hold", "Other Hold");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-hold.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-hold.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + otherBranch.getId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + emptyId + "/hold")
                .cookie(otherCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  private UUID lineId(Fixture fx, UUID invoiceId) {
    return salesInvoiceLineRepository
        .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoiceId, fx.tenantId(), fx.branchId())
        .get(0)
        .getId();
  }

  private void completeCash(Fixture fx, UUID invoiceId, int version, String key) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    completeJson(
                        version, TOTAL, 0, key, "{\"mode\":\"CASH\",\"amountPaise\":11200}")))
        .andExpect(status().isOk());
  }

  private UUID createDraft(
      Fixture fx, Stocked product, UUID customerId, UUID doctorId, boolean verified, String key)
      throws Exception {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    String doctor = doctorId == null ? "null" : "\"" + doctorId + "\"";
    String reference = verified ? "\"RX-HLD-4\"" : "null";
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
                          "doctorId":%s,
                          "prescriptionReference":%s,
                          "prescriptionVerified":%s,
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
                            .formatted(
                                customer,
                                doctor,
                                reference,
                                verified,
                                key,
                                product.productId(),
                                product.batchId())))
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

  private UUID createDoctor(Cookie cookie, String name, String registration) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/doctors")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"%s\",\"registrationNumber\":\"%s\"}"
                            .formatted(name, registration)))
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
                                .content(productJson(sku, name, categoryId, "12")))
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-HH\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
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
    return new Stocked(productId, batchId, categoryId);
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Hold " + tag);
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

  private static String productJson(String sku, String name, UUID categoryId, String gstRate) {
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
          "gstRate":%s,
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
          "taxCategory":"GST-%s",
          "requiresBatchTracking":true,
          "requiresExpiryTracking":true,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId, gstRate, gstRate);
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId, UUID categoryId) {}
}
