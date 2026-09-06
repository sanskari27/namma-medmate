package com.nammamedmate.server.feature.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.FinanceReportPolicy;
import com.nammamedmate.server.domain.GoodsReceipt;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.GoodsReceiptStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.PurchaseOrder;
import com.nammamedmate.server.domain.PurchaseOrderLine;
import com.nammamedmate.server.domain.PurchaseOrderStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import com.nammamedmate.server.domain.SupplierPayableAccount;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.domain.SupplierStatus;
import com.nammamedmate.server.domain.SupplierType;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class FinanceReportTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;
  private static final long RENT = 2_000L;
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private SupplierRepository supplierRepository;
  @Autowired private SupplierPayableAccountRepository payableAccountRepository;
  @Autowired private SupplierLedgerEntryRepository supplierLedgerRepository;
  @Autowired private PurchaseOrderRepository purchaseOrderRepository;
  @Autowired private PurchaseOrderLineRepository purchaseOrderLineRepository;
  @Autowired private GoodsReceiptRepository goodsReceiptRepository;
  @Autowired private GoodsReceiptLineRepository goodsReceiptLineRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_profitIsRevenueMinusPurchasePriceCogsMinusPostedSpend() throws Exception {
    Fixture fx = seed("fr-ac01");
    Stocked product = stocked(fx, "PL-1", "P&L Pack");
    UUID invoiceId = createDraft(fx, product, "pl-1");
    completeCash(fx, invoiceId, 1, "pl-complete-1");
    postRent(fx, RENT, today(), "pl-rent");

    mockMvc
        .perform(
            get("/api/v1/finance/reports/PROFIT_AND_LOSS")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.key").value("PROFIT_AND_LOSS"))
        .andExpect(jsonPath("$.data.totals[?(@.key=='revenue')].amountPaise").value(hasItem(11200)))
        .andExpect(jsonPath("$.data.totals[?(@.key=='cogs')].amountPaise").value(hasItem(5000)))
        .andExpect(jsonPath("$.data.totals[?(@.key=='expenses')].amountPaise").value(hasItem(2000)))
        .andExpect(jsonPath("$.data.totals[?(@.key=='profit')].amountPaise").value(hasItem(4200)))
        .andExpect(jsonPath("$.data.items[*].line", hasItem("Revenue")))
        .andExpect(jsonPath("$.data.items[*].line", not(hasItem("Trial balance"))))
        .andExpect(jsonPath("$.data.items[*].line", not(hasItem("Balance sheet"))));
  }

  @Test
  void ac02_gstOutputIsGstr1StyleSalesAndGstr3bStyleSummary() throws Exception {
    Fixture fx = seed("fr-ac02");
    Stocked product = stocked(fx, "GST-R", "GST Pack");
    UUID walkIn = createDraft(fx, product, "gst-walk");
    completeCash(fx, walkIn, 1, "gst-walk-c");
    UUID billed = createDraft(fx, product, "gst-b2b");
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + billed + "/pricing")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pricingJson(1, product.productId(), "27AAAAA0000A1Z5")))
        .andExpect(status().isOk());
    completeCash(fx, billed, 2, "gst-b2b-c");
    persistCheckedReceipt(fx, product.productId(), 1_800L);

    mockMvc
        .perform(
            get("/api/v1/finance/reports/GSTR1")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[*].section", hasItem("B2B")))
        .andExpect(jsonPath("$.data.items[*].section", hasItem("B2CS")))
        .andExpect(jsonPath("$.data.items[*].hsn", hasItem("30049099")))
        .andExpect(
            jsonPath("$.data.totals[?(@.key=='b2bTaxable')].amountPaise").value(hasItem(10000)))
        .andExpect(
            jsonPath("$.data.totals[?(@.key=='b2csTaxable')].amountPaise").value(hasItem(10000)));

    mockMvc
        .perform(
            get("/api/v1/finance/reports/GSTR3B")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.totals[?(@.key=='outwardTaxable')].amountPaise").value(hasItem(20000)))
        .andExpect(jsonPath("$.data.totals[?(@.key=='itc')].amountPaise").value(hasItem(1800)))
        .andExpect(jsonPath("$.data.totals[?(@.key=='payable')].amountPaise").value(hasItem(600)));
  }

  @Test
  void ac03_reportsAreBranchFilterableAndOwnerConsolidates() throws Exception {
    Fixture fx = seed("fr-ac03");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "SC-1", "Scope Pack");
    UUID invoiceId = createDraft(fx, product, "sc-1");
    completeCash(fx, invoiceId, 1, "sc-complete");
    postRent(fx, RENT, today(), "sc-main-rent");
    postRentOn(fx, annex.getId(), 3_000L, today(), "sc-annex-rent");
    persistStockistInvoice(fx, fx.branchId(), 40_000L, Instant.now());

    mockMvc
        .perform(
            get("/api/v1/finance/reports/EXPENSE_SUMMARY")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("branch"))
        .andExpect(
            jsonPath("$.data.totals[?(@.key=='postedSpend')].amountPaise").value(hasItem(2000)));

    mockMvc
        .perform(
            get("/api/v1/finance/reports/EXPENSE_SUMMARY")
                .param("from", today().toString())
                .param("to", today().toString())
                .param("scope", "tenant")
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("tenant"))
        .andExpect(
            jsonPath("$.data.totals[?(@.key=='postedSpend')].amountPaise").value(hasItem(5000)));

    mockMvc
        .perform(
            get("/api/v1/finance/reports/BRANCH_PNL")
                .param("from", today().toString())
                .param("to", today().toString())
                .param("scope", "tenant")
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(2)))
        .andExpect(jsonPath("$.data.items[*].branchName", hasItem("Main")))
        .andExpect(jsonPath("$.data.items[*].branchName", hasItem("Annex")));

    mockMvc
        .perform(
            get("/api/v1/finance/reports/PURCHASE_SUMMARY")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.totals[?(@.key=='netPurchases')].amountPaise").value(hasItem(40000)))
        .andExpect(jsonPath("$.data.items[0].supplier").value("Acme Stockist"));

    mockMvc
        .perform(
            get("/api/v1/finance/reports/DAY_BOOK")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.data.totals[?(@.key=='cashLike')].amountPaise").value(hasItem(11200)))
        .andExpect(jsonPath("$.data.items[*].kind", hasItem("Cash")));

    AppUser books = persistUser(fx.tenantId(), "books@fr-ac03.local", AppUserRole.pharmacy_staff);
    assignAccountant(fx.cookie(), books.getId());
    assignBranch(fx.cookie(), books.getId(), fx.branchId());
    Cookie accountant = login("books@fr-ac03.local");
    selectBranch(accountant, fx.branchId());
    mockMvc
        .perform(
            get("/api/v1/finance/reports/BRANCH_PNL").param("scope", "tenant").cookie(accountant))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            get("/api/v1/finance/reports/EXPENSE_SUMMARY")
                .param("scope", "tenant")
                .cookie(accountant))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac04_ac05_tdsCashDrawerAndAccountingExportStayAbsent() throws Exception {
    Fixture fx = seed("fr-out");
    mockMvc
        .perform(get("/api/v1/finance/reports").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(8)))
        .andExpect(jsonPath("$.data.items[0].key").value("DAY_BOOK"))
        .andExpect(jsonPath("$.data.items[*].key", not(hasItem("TDS"))))
        .andExpect(jsonPath("$.data.items[*].key", not(hasItem("CASH_DRAWER"))));
    mockMvc
        .perform(get("/api/v1/finance/tds").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/finance/cash-drawer").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/finance/tally-export").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/finance/reports/TDS").cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/finance/reports/CASH_DRAWER").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac06_isolationValidationAndExportAudit() throws Exception {
    Fixture fx = seed("fr-iso");
    Stocked product = stocked(fx, "ISO-1", "Iso Pack");
    UUID invoiceId = createDraft(fx, product, "iso-1");
    completeCash(fx, invoiceId, 1, "iso-complete");

    mockMvc.perform(get("/api/v1/finance/reports")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(
            get("/api/v1/finance/reports/SALES_SUMMARY")
                .param("from", today().plusDays(1).toString())
                .param("to", today().plusDays(1).toString())
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(FinanceReportPolicy.FUTURE_AS_OF));
    mockMvc
        .perform(
            get("/api/v1/finance/reports/SALES_SUMMARY")
                .param("from", "2024-01-01")
                .param("to", "2026-01-10")
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(FinanceReportPolicy.RANGE_UNSUPPORTED));

    AppUser cashier = persistUser(fx.tenantId(), "till@fr-iso.local", AppUserRole.pharmacy_staff);
    UUID salesRole = createRole(fx.cookie(), "Till", "[\"SALES\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + cashier.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesRole + "\"]}"))
        .andExpect(status().isOk());
    assignBranch(fx.cookie(), cashier.getId(), fx.branchId());
    Cookie till = login("till@fr-iso.local");
    selectBranch(till, fx.branchId());
    mockMvc
        .perform(get("/api/v1/finance/reports").cookie(till))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    Tenant other = persistTenant("other-fr", "Other Fr");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-fr.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-fr.local");
    selectBranch(otherCookie, otherBranch.getId());
    mockMvc
        .perform(
            get("/api/v1/finance/reports/SALES_SUMMARY")
                .param("branchId", fx.branchId().toString())
                .cookie(otherCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    MvcResult csv =
        mockMvc
            .perform(
                get("/api/v1/finance/reports/SALES_SUMMARY/export")
                    .param("format", "csv")
                    .param("from", today().toString())
                    .param("to", today().toString())
                    .cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(
                header()
                    .string(
                        "Content-Disposition",
                        org.hamcrest.Matchers.containsString("sales-summary-shop-book.csv")))
            .andExpect(content().contentTypeCompatibleWith("text/csv"))
            .andReturn();
    assertThat(csv.getResponse().getContentAsString()).contains("invoiceNumber");
    mockMvc
        .perform(
            get("/api/v1/finance/reports/DAY_BOOK/export")
                .param("format", "pdf")
                .param("from", today().toString())
                .param("to", today().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
    List<AuditEvent> audits =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            fx.tenantId(), Instant.now().minusSeconds(60));
    assertThat(audits.stream().map(AuditEvent::getAction)).contains(FinanceReportPolicy.ACTION);
  }

  private LocalDate today() {
    return LocalDate.now(IST);
  }

  private void postRent(Fixture fx, long amount, LocalDate occurredOn, String key)
      throws Exception {
    postRentOn(fx, fx.branchId(), amount, occurredOn, key);
  }

  private void postRentOn(Fixture fx, UUID branchId, long amount, LocalDate occurredOn, String key)
      throws Exception {
    UUID rentId = categoryId(listCategories(fx.cookie()), "RENT");
    String json =
        """
        {
          "categoryId":"%s",
          "amountPaise":%d,
          "occurredOn":"%s",
          "notes":"rent",
          "branchId":"%s",
          "idempotencyKey":"%s"
        }
        """
            .formatted(rentId, amount, occurredOn, branchId, key);
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isOk());
  }

  private JsonNode listCategories(Cookie cookie) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/finance/expense-categories").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(body).path("data");
  }

  private UUID categoryId(JsonNode data, String code) {
    for (JsonNode item : data.path("items")) {
      if (code.equals(item.path("code").asText())) {
        return UUID.fromString(item.path("id").asText());
      }
    }
    throw new IllegalStateException("missing category " + code);
  }

  private void completeCash(Fixture fx, UUID invoiceId, int version, String key) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "expectedVersion":%d,
                      "expectedTotalPaise":%d,
                      "changePaise":0,
                      "idempotencyKey":"%s",
                      "payments":[{"mode":"CASH","amountPaise":11200}]
                    }
                    """
                        .formatted(version, TOTAL, key)))
        .andExpect(status().isOk());
  }

  private UUID createDraft(Fixture fx, Stocked product, String key) throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/sales/invoices")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "customerId":null,
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
                            "discountPaise":0,
                            "prescribedQuantity":null
                          }]
                        }
                        """
                            .formatted(key, product.productId(), product.batchId())))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private static String pricingJson(int version, UUID productId, String customerGstin) {
    return """
        {
          "expectedVersion":%d,
          "customerGstin":"%s",
          "billDiscountType":"NONE",
          "billDiscountValue":0,
          "lines":[{"productId":"%s","type":"NONE","value":0}]
        }
        """
        .formatted(version, customerGstin, productId);
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-%s\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":%d,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku, COST, sku)))
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

  private void persistStockistInvoice(Fixture fx, UUID branchId, long amount, Instant occurredAt) {
    Supplier supplier = persistSupplier(fx.tenantId(), "SUP-FR", "Acme Stockist");
    SupplierPayableAccount account = new SupplierPayableAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(fx.tenantId());
    account.setBranchId(branchId);
    account.setSupplierId(supplier.getId());
    account.setBalancePaise(amount);
    account.setVersion(1);
    account.setCreatedAt(occurredAt);
    account.setUpdatedAt(occurredAt);
    payableAccountRepository.saveAndFlush(account);
    SupplierLedgerEntry entry = new SupplierLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(fx.tenantId());
    entry.setBranchId(branchId);
    entry.setSupplierId(supplier.getId());
    entry.setAccountId(account.getId());
    entry.setType(SupplierLedgerType.INVOICE);
    entry.setAmountPaise(amount);
    entry.setBalanceAfterPaise(amount);
    entry.setIdempotencyKey("inv-" + entry.getId());
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    supplierLedgerRepository.saveAndFlush(entry);
  }

  private void persistCheckedReceipt(Fixture fx, UUID productId, long taxPaise) {
    Instant now = Instant.now();
    Supplier supplier = persistSupplier(fx.tenantId(), "SUP-ITC", "Itc Stockist");
    PurchaseOrder po = new PurchaseOrder();
    po.setId(UUID.randomUUID());
    po.setTenantId(fx.tenantId());
    po.setBranchId(fx.branchId());
    po.setSupplierId(supplier.getId());
    po.setPoNumber("PO-ITC");
    po.setStatus(PurchaseOrderStatus.ISSUED);
    po.setPaymentTerms(SupplierPaymentTerms.CREDIT);
    po.setVersion(1);
    po.setSubtotalPaise(15_000L);
    po.setTaxPaise(taxPaise);
    po.setTotalPaise(15_000L + taxPaise);
    po.setIdempotencyKey("po-itc-" + po.getId());
    po.setCreatedByUserId(fx.userId());
    po.setCreatedAt(now);
    po.setUpdatedAt(now);
    purchaseOrderRepository.saveAndFlush(po);
    PurchaseOrderLine line = new PurchaseOrderLine();
    line.setId(UUID.randomUUID());
    line.setTenantId(fx.tenantId());
    line.setBranchId(fx.branchId());
    line.setPurchaseOrderId(po.getId());
    line.setProductId(productId);
    line.setProductName("Itc Pack");
    line.setSku("ITC-1");
    line.setQuantity(new BigDecimal("10"));
    line.setUnitRatePaise(1_500L);
    line.setGstRate(new BigDecimal("12"));
    line.setLineSubtotalPaise(15_000L);
    line.setLineTaxPaise(taxPaise);
    line.setLineTotalPaise(15_000L + taxPaise);
    line.setSortOrder(0);
    line.setCreatedAt(now);
    purchaseOrderLineRepository.saveAndFlush(line);
    GoodsReceipt receipt = new GoodsReceipt();
    receipt.setId(UUID.randomUUID());
    receipt.setTenantId(fx.tenantId());
    receipt.setBranchId(fx.branchId());
    receipt.setPurchaseOrderId(po.getId());
    receipt.setSupplierId(supplier.getId());
    receipt.setReceiptNumber("GRN-ITC");
    receipt.setReceiptReference("CH-ITC");
    receipt.setStatus(GoodsReceiptStatus.CHECKED);
    receipt.setIdempotencyKey("grn-itc-" + receipt.getId());
    receipt.setCreatedByUserId(fx.userId());
    receipt.setCreatedAt(now);
    receipt.setCheckedAt(now);
    receipt.setCheckedByUserId(fx.userId());
    goodsReceiptRepository.saveAndFlush(receipt);
    GoodsReceiptLine grLine = new GoodsReceiptLine();
    grLine.setId(UUID.randomUUID());
    grLine.setTenantId(fx.tenantId());
    grLine.setBranchId(fx.branchId());
    grLine.setGoodsReceiptId(receipt.getId());
    grLine.setPurchaseOrderLineId(line.getId());
    grLine.setProductId(line.getProductId());
    grLine.setProductName(line.getProductName());
    grLine.setSku(line.getSku());
    grLine.setQuantity(new BigDecimal("10"));
    grLine.setUnitRatePaise(1_500L);
    grLine.setSortOrder(0);
    grLine.setCreatedAt(now);
    grLine.setAcceptedQuantity(new BigDecimal("10"));
    goodsReceiptLineRepository.saveAndFlush(grLine);
  }

  private Supplier persistSupplier(UUID tenantId, String code, String legalName) {
    Supplier supplier = new Supplier();
    supplier.setId(UUID.randomUUID());
    supplier.setTenantId(tenantId);
    supplier.setSupplierCode(code);
    supplier.setLegalName(legalName);
    supplier.setSupplierType(SupplierType.DISTRIBUTOR);
    supplier.setContactPersonName("Ravi");
    supplier.setPhone("9876500001");
    supplier.setAddressLine1("12 Stockist Road");
    supplier.setCity("Bengaluru");
    supplier.setState("KA");
    supplier.setPincode("560001");
    supplier.setCountry("IN");
    supplier.setPaymentTerms(SupplierPaymentTerms.CREDIT);
    supplier.setCreditPeriodDays(30);
    supplier.setStatus(SupplierStatus.ACTIVE);
    supplier.setCreatedAt(T0);
    supplier.setUpdatedAt(T0);
    return supplierRepository.saveAndFlush(supplier);
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

  private void assignAccountant(Cookie owner, UUID userId) throws Exception {
    UUID roleId = predefinedId(owner, "accountant");
    mockMvc
        .perform(
            put("/api/v1/users/" + userId + "/roles")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
  }

  private UUID predefinedId(Cookie cookie, String code) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/roles").cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    for (JsonNode role : objectMapper.readTree(body).path("data").path("roles")) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
  }

  private void assignBranch(Cookie owner, UUID userId, UUID branchId) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/users/" + userId + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branchId + "\"]}"))
        .andExpect(status().isOk());
  }

  private void selectBranch(Cookie cookie, UUID branchId) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branchId + "\"}"))
        .andExpect(status().isOk());
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Fr " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
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
    Map<String, Object> pricing = new LinkedHashMap<>();
    pricing.put("defaultMarkupBps", 0);
    pricing.put("roundToNearestPaise", 1);
    branch.setPricingSettings(pricing);
    Map<String, Object> tax = new LinkedHashMap<>();
    tax.put("gstMode", "CGST_SGST");
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
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
