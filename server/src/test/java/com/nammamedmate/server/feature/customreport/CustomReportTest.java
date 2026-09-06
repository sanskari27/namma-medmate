package com.nammamedmate.server.feature.customreport;

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
import com.nammamedmate.server.domain.CustomReportPolicy;
import com.nammamedmate.server.domain.Customer;
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
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.domain.SupplierStatus;
import com.nammamedmate.server.domain.SupplierType;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.GoodsReceiptRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseOrderLineRepository;
import com.nammamedmate.server.persistence.PurchaseOrderRepository;
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

class CustomReportTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;
  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private SupplierRepository supplierRepository;
  @Autowired private PurchaseOrderRepository purchaseOrderRepository;
  @Autowired private PurchaseOrderLineRepository purchaseOrderLineRepository;
  @Autowired private GoodsReceiptRepository goodsReceiptRepository;
  @Autowired private GoodsReceiptLineRepository goodsReceiptLineRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_catalogExposesOnlyAllowlistedFieldsAndOperators() throws Exception {
    Fixture fx = seed("cr-ac01", PlanCode.GROWTH);
    mockMvc
        .perform(get("/api/v1/reports/custom").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.datasets", hasSize(5)))
        .andExpect(jsonPath("$.data.datasets[*].key", hasItem("SALES")))
        .andExpect(jsonPath("$.data.datasets[*].key", hasItem("STOCK")))
        .andExpect(jsonPath("$.data.datasets[*].key", hasItem("CUSTOMERS")))
        .andExpect(jsonPath("$.data.datasets[*].key", hasItem("PURCHASES")))
        .andExpect(jsonPath("$.data.datasets[*].key", hasItem("EXPENSES")))
        .andExpect(jsonPath("$.data.operators[*].key", hasItem("EQ")))
        .andExpect(jsonPath("$.data.operators[*].key", hasItem("CONTAINS")))
        .andExpect(jsonPath("$.data.operators[*].key", not(hasItem("LIKE"))))
        .andExpect(
            jsonPath("$.data.datasets[?(@.key=='SALES')].fields[*].key", hasItem("invoiceNumber")))
        .andExpect(
            jsonPath(
                "$.data.datasets[?(@.key=='SALES')].fields[*].key", not(hasItem("passwordHash"))));
    mockMvc.perform(get("/api/v1/reports").cookie(fx.cookie())).andExpect(status().isNotFound());
  }

  @Test
  void ac01_previewRejectsUnknownFieldAndUnsafeOperator() throws Exception {
    Fixture fx = seed("cr-ac01b", PlanCode.GROWTH);
    Stocked product = stocked(fx, "CR-UN", "Unknown Pack");
    completeCash(fx, createDraft(fx, product, "cr-un-d"), 1, "cr-un-c");

    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("SALES", "[\"passwordHash\"]", "[]")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CustomReportPolicy.UNKNOWN_FIELD))
        .andExpect(jsonPath("$.data").doesNotExist());
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    queryJson(
                        "SALES",
                        "[\"productName\"]",
                        "[{\"field\":\"productName\",\"operator\":\"LIKE\",\"value\":\"Pack\"}]")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CustomReportPolicy.UNKNOWN_OPERATOR));
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("SALES", "[\"=SUM(A1)\"]", "[]")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CustomReportPolicy.UNKNOWN_FIELD));
  }

  @Test
  void ac02_previewAndExportCsvAndPdfFromAllowlistedQuery() throws Exception {
    Fixture fx = seed("cr-ac02", PlanCode.GROWTH);
    Customer patient = persistCustomer(fx.tenantId(), "Anika Patient", "9888000001");
    Stocked product = stocked(fx, "CR-TOP", "Top Pack");
    completeCash(fx, createDraft(fx, product, patient.getId(), "cr-top-d"), 1, "cr-top-c");
    persistCheckedReceipt(fx, product.productId());
    persistCustomer(fx.tenantId(), "=1+1", "9888000002");
    postRent(fx, 2_000L, today(), "cr-rent");

    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    queryJson(
                        "SALES",
                        "[\"invoiceNumber\",\"productName\",\"customerName\",\"sellingPaise\"]",
                        "[{\"field\":\"productName\",\"operator\":\"CONTAINS\",\"value\":\"Top\"}]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.dataset").value("SALES"))
        .andExpect(jsonPath("$.data.columns", hasItem("invoiceNumber")))
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].productName").value("Top Pack"))
        .andExpect(jsonPath("$.data.items[0].customerName").value("Anika Patient"))
        .andExpect(jsonPath("$.data.items[0].passwordHash").doesNotExist());

    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("STOCK", "[\"movementType\",\"sku\",\"batchNumber\"]", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[*].sku", hasItem("CR-TOP")));

    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("CUSTOMERS", "[\"name\",\"phone\"]", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[*].name", hasItem("Anika Patient")));

    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("PURCHASES", "[\"poNumber\",\"supplierName\",\"sku\"]", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].poNumber").value("PO-CR"))
        .andExpect(jsonPath("$.data.items[0].supplierName").value("Acme Stockist"));

    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("EXPENSES", "[\"categoryCode\",\"amountPaise\"]", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].categoryCode").value("RENT"))
        .andExpect(jsonPath("$.data.items[0].amountPaise").value("2000"));

    MvcResult csv =
        mockMvc
            .perform(
                post("/api/v1/reports/custom/export")
                    .param("format", "csv")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(queryJson("CUSTOMERS", "[\"name\",\"phone\"]", "[]")))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("text/csv"))
            .andExpect(
                header()
                    .string("Content-Disposition", org.hamcrest.Matchers.containsString(".csv")))
            .andReturn();
    assertThat(csv.getResponse().getContentAsString()).contains("'=1+1");
    assertThat(csv.getResponse().getContentAsString()).doesNotContain("\n=1+1");

    mockMvc
        .perform(
            post("/api/v1/reports/custom/export")
                .param("format", "pdf")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("SALES", "[\"invoiceNumber\",\"productName\"]", "[]")))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
    List<AuditEvent> audits =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            fx.tenantId(), Instant.now().minusSeconds(60));
    assertThat(audits.stream().map(AuditEvent::getAction)).contains(CustomReportPolicy.ACTION);
  }

  @Test
  void ac03_scheduledDeliveryIsAbsent() throws Exception {
    Fixture fx = seed("cr-ac03", PlanCode.GROWTH);
    mockMvc
        .perform(get("/api/v1/reports/custom/schedule").cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            post("/api/v1/reports/custom/schedule")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"cron\":\"0 21 * * *\"}"))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/reports/custom").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.schedule").doesNotExist())
        .andExpect(jsonPath("$.data.delivery").doesNotExist());
  }

  @Test
  void ac04_queriesStayTenantScopedAndOwnerMayUseAllOutlets() throws Exception {
    Fixture fx = seed("cr-ac04", PlanCode.GROWTH);
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "CR-SC", "Scope Pack");
    completeCash(fx, createDraft(fx, product, "cr-sc-d"), 1, "cr-sc-c");
    Fixture other = seed("cr-ac04-b", PlanCode.GROWTH);
    Stocked theirs = stocked(other, "CR-OT", "Theirs Pack");
    completeCash(other, createDraft(other, theirs, "cr-ot-d"), 1, "cr-ot-c");

    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("SALES", "[\"productName\"]", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[*].productName", hasItem("Scope Pack")))
        .andExpect(jsonPath("$.data.items[*].productName", not(hasItem("Theirs Pack"))));
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("SALES", "[\"productName\"]", "[]", "tenant", null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("tenant"));
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    queryJson(
                        "SALES", "[\"productName\"]", "[]", "branch", annex.getId().toString())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac05_isolationPlanDeniedAndUnauthenticatedFailClearly() throws Exception {
    Fixture free = seed("cr-ac05-free", PlanCode.FREE);
    mockMvc
        .perform(get("/api/v1/reports/custom").cookie(free.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CustomReportPolicy.PLAN_LIMIT))
        .andExpect(jsonPath("$.data").doesNotExist());

    Fixture fx = seed("cr-ac05", PlanCode.GROWTH);
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@cr-ac05.local");
    Cookie accountant = staffWithPredefined(fx, "accountant", "books@cr-ac05.local");
    mockMvc
        .perform(get("/api/v1/reports/custom").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc.perform(get("/api/v1/reports/custom").cookie(accountant)).andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    queryJson(
                        "SALES", "[\"productName\"]", "[]", "branch", annex.getId().toString())))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.data").doesNotExist());
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content(queryJson("SALES", "[\"productName\"]", "[]", "tenant", null)))
        .andExpect(status().isBadRequest());
    Fixture other = seed("cr-ac05-b", PlanCode.GROWTH);
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(other.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    queryJson(
                        "SALES", "[\"productName\"]", "[]", "branch", fx.branchId().toString())))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc.perform(get("/api/v1/reports/custom")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(
            post("/api/v1/reports/custom/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"dataset":"SALES","columns":["productName"],"filters":[],"from":"2024-01-01","to":"2026-01-10"}
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value(CustomReportPolicy.RANGE_UNSUPPORTED));
  }

  private String queryJson(String dataset, String columns, String filters) {
    return queryJson(dataset, columns, filters, null, null);
  }

  private String queryJson(
      String dataset, String columns, String filters, String scope, String branchId) {
    String today = today().toString();
    String scopeJson = scope == null ? "" : ",\"scope\":\"" + scope + "\"";
    String branchJson = branchId == null ? "" : ",\"branchId\":\"" + branchId + "\"";
    return """
        {"dataset":"%s","columns":%s,"filters":%s,"from":"%s","to":"%s"%s%s}
        """
        .formatted(dataset, columns, filters, today, today, scopeJson, branchJson);
  }

  private LocalDate today() {
    return LocalDate.now(IST);
  }

  private void postRent(Fixture fx, long amount, LocalDate occurredOn, String key)
      throws Exception {
    UUID rentId =
        categoryId(
            objectMapper.readTree(
                mockMvc
                    .perform(get("/api/v1/finance/expense-categories").cookie(fx.cookie()))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString()),
            "RENT");
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"categoryId":"%s","amountPaise":%d,"occurredOn":"%s","notes":"rent","branchId":"%s","idempotencyKey":"%s"}
                    """
                        .formatted(rentId, amount, occurredOn, fx.branchId(), key)))
        .andExpect(status().isOk());
  }

  private UUID categoryId(JsonNode root, String code) {
    for (JsonNode item : root.path("data").path("items")) {
      if (code.equals(item.path("code").asText())) {
        return UUID.fromString(item.path("id").asText());
      }
    }
    throw new IllegalStateException("missing category " + code);
  }

  private void persistCheckedReceipt(Fixture fx, UUID productId) {
    Instant now = Instant.now();
    Supplier supplier = persistSupplier(fx.tenantId(), "SUP-CR", "Acme Stockist");
    PurchaseOrder po = new PurchaseOrder();
    po.setId(UUID.randomUUID());
    po.setTenantId(fx.tenantId());
    po.setBranchId(fx.branchId());
    po.setSupplierId(supplier.getId());
    po.setPoNumber("PO-CR");
    po.setStatus(PurchaseOrderStatus.ISSUED);
    po.setPaymentTerms(SupplierPaymentTerms.CREDIT);
    po.setVersion(1);
    po.setSubtotalPaise(15_000L);
    po.setTaxPaise(1_800L);
    po.setTotalPaise(16_800L);
    po.setIdempotencyKey("po-cr-" + po.getId());
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
    line.setSku("CR-TOP");
    line.setQuantity(new BigDecimal("10"));
    line.setUnitRatePaise(1_500L);
    line.setGstRate(new BigDecimal("12"));
    line.setLineSubtotalPaise(15_000L);
    line.setLineTaxPaise(1_800L);
    line.setLineTotalPaise(16_800L);
    line.setSortOrder(0);
    line.setCreatedAt(now);
    purchaseOrderLineRepository.saveAndFlush(line);
    GoodsReceipt receipt = new GoodsReceipt();
    receipt.setId(UUID.randomUUID());
    receipt.setTenantId(fx.tenantId());
    receipt.setBranchId(fx.branchId());
    receipt.setPurchaseOrderId(po.getId());
    receipt.setSupplierId(supplier.getId());
    receipt.setReceiptNumber("GRN-CR");
    receipt.setReceiptReference("CH-CR");
    receipt.setStatus(GoodsReceiptStatus.CHECKED);
    receipt.setIdempotencyKey("grn-cr-" + receipt.getId());
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
    grLine.setProductId(productId);
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

  private UUID createDraft(Fixture fx, Stocked product, String key) throws Exception {
    return createDraft(fx, product, null, key);
  }

  private UUID createDraft(Fixture fx, Stocked product, UUID customerId, String key)
      throws Exception {
    return idOf(
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
                            "discountPaise":0,
                            "prescribedQuantity":null
                          }]
                        }
                        """
                            .formatted(
                                customerId == null ? "null" : "\"" + customerId + "\"",
                                key,
                                product.productId(),
                                product.batchId())))
            .andExpect(status().isOk())
            .andReturn());
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

  private Stocked stocked(Fixture fx, String sku, String name) throws Exception {
    UUID categoryId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/product-categories")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + sku + " cat\"}"))
                .andExpect(status().isOk())
                .andReturn());
    UUID productId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/products")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(productJson(sku, name, categoryId)))
                .andExpect(status().isOk())
                .andReturn());
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

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedId(fx.cookie(), roleCode);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie cookie = login(email);
    selectBranch(cookie, fx.branchId());
    return cookie;
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

  private void selectBranch(Cookie cookie, UUID branchId) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + branchId + "\"}"))
        .andExpect(status().isOk());
  }

  private Fixture seed(String tag, PlanCode plan) throws Exception {
    Tenant tenant = persistTenant(tag, "An " + tag);
    persistPlan(tenant.getId(), plan);
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

  private Customer persistCustomer(UUID tenantId, String name, String phone) {
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenantId);
    customer.setName(name);
    customer.setPhone(phone);
    customer.setCreatedAt(Instant.now());
    customer.setUpdatedAt(Instant.now());
    return customerRepository.saveAndFlush(customer);
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
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
