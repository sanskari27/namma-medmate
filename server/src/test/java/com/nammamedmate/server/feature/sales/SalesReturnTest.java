package com.nammamedmate.server.feature.sales;

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
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesReturnDecision;
import com.nammamedmate.server.domain.SalesReturnRefundMode;
import com.nammamedmate.server.domain.StockBatch;
import com.nammamedmate.server.domain.StockMovementType;
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
import com.nammamedmate.server.persistence.SalesInvoiceLineRepository;
import com.nammamedmate.server.persistence.SalesReturnLineRepository;
import com.nammamedmate.server.persistence.SalesReturnRepository;
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

class SalesReturnTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T08:00:00Z");
  private static final long UNIT_TOTAL = 11200L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceLineRepository salesInvoiceLineRepository;
  @Autowired private SalesReturnRepository salesReturnRepository;
  @Autowired private SalesReturnLineRepository salesReturnLineRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private CustomerCreditAccountRepository creditAccountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository ledgerRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_previewIsReadOnlyAndConfirmRecordsReasonAndDecision() throws Exception {
    Fixture fx = seed("ret-ac01");
    Stocked product = stocked(fx, "RET-1", "Return Pack", true);
    UUID invoiceId = sell(fx, product, null, 4, "ret-1");
    UUID lineId = lineId(fx, invoiceId);
    BigDecimal stockBefore = floorQuantity(fx, product);

    mockMvc
        .perform(
            post("/api/v1/sales/returns/preview")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Wrong strength", null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.refundTotalPaise").value(11200))
        .andExpect(jsonPath("$.data.cashRefundPaise").value(11200))
        .andExpect(jsonPath("$.data.creditNotePaise").value(0))
        .andExpect(jsonPath("$.data.lines", hasSize(1)))
        .andExpect(jsonPath("$.data.lines[0].batchId").value(product.batchId().toString()))
        .andExpect(jsonPath("$.data.lines[0].refundAmountPaise").value(11200));

    assertThat(salesReturnRepository.count()).isZero();
    assertThat(salesReturnLineRepository.count()).isZero();
    assertThat(floorQuantity(fx, product)).isEqualByComparingTo(stockBefore);

    MvcResult confirmed =
        mockMvc
            .perform(
                post("/api/v1/sales/returns")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        returnJson(invoiceId, lineId, "1", "CASH", "Wrong strength", "sr-ac01")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.reason").value("Wrong strength"))
            .andExpect(jsonPath("$.data.decision").value("APPROVED"))
            .andExpect(jsonPath("$.data.refundMode").value("CASH"))
            .andExpect(jsonPath("$.data.salesInvoiceId").value(invoiceId.toString()))
            .andReturn();
    UUID returnId = idOf(confirmed);

    assertThat(salesReturnRepository.findById(returnId).orElseThrow())
        .satisfies(
            row -> {
              assertThat(row.getReason()).isEqualTo("Wrong strength");
              assertThat(row.getDecision()).isEqualTo(SalesReturnDecision.APPROVED);
              assertThat(row.getRefundMode()).isEqualTo(SalesReturnRefundMode.CASH);
              assertThat(row.getCreatedByUserId()).isEqualTo(fx.userId());
            });
    assertThat(auditEventRepository.findAll())
        .extracting(AuditEvent::getAction)
        .contains("SALES_RETURN");

    mockMvc
        .perform(get("/api/v1/sales/returns").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(returnId.toString()))
        .andExpect(jsonPath("$.data.items[0].refundTotalPaise").value(11200));
    mockMvc
        .perform(get("/api/v1/sales/returns/" + returnId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.lines[0].salesInvoiceLineId").value(lineId.toString()))
        .andExpect(jsonPath("$.data.lines[0].quantity").value(1));
  }

  @Test
  void ac02_returnedQuantityCannotExceedNetSoldQuantity() throws Exception {
    Fixture fx = seed("ret-ac02");
    Stocked product = stocked(fx, "RET-2", "Net Sold Pack", true);
    UUID invoiceId = sell(fx, product, null, 4, "ret-2");
    UUID lineId = lineId(fx, invoiceId);

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "5", "CASH", "Too many", "sr-ac02-over")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_RETURN"));

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "3", "CASH", "Damaged", "sr-ac02-a")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundTotalPaise").value(33600));

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "2", "CASH", "Damaged", "sr-ac02-b")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_RETURN"));

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Damaged", "sr-ac02-c")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundTotalPaise").value(11200));
  }

  @Test
  void ac03_acceptedProductReturnsToTheOriginatingBatch() throws Exception {
    Fixture fx = seed("ret-ac03");
    Stocked product = stocked(fx, "RET-3", "Batch Pack", true);
    UUID invoiceId = sell(fx, product, null, 4, "ret-3");
    UUID lineId = lineId(fx, invoiceId);
    assertThat(floorQuantity(fx, product)).isEqualByComparingTo("6");

    MvcResult confirmed =
        mockMvc
            .perform(
                post("/api/v1/sales/returns")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(returnJson(invoiceId, lineId, "2", "CASH", "Unopened", "sr-ac03")))
            .andExpect(status().isOk())
            .andReturn();
    UUID returnId = idOf(confirmed);

    assertThat(floorQuantity(fx, product)).isEqualByComparingTo("8");
    assertThat(
            stockMovementRepository.findByTenantIdAndIdempotencyKey(
                fx.tenantId(), "sales-return:" + returnId + ":" + lineId))
        .get()
        .satisfies(
            movement -> {
              assertThat(movement.getType()).isEqualTo(StockMovementType.SALES_RETURN);
              assertThat(movement.getBatchId()).isEqualTo(product.batchId());
              assertThat(movement.getQuantity()).isEqualByComparingTo("2");
              assertThat(movement.getBalanceAfter()).isEqualByComparingTo("8");
            });
    assertThat(
            salesReturnLineRepository
                .findAllBySalesReturnIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                    returnId, fx.tenantId(), fx.branchId())
                .get(0)
                .getStockMovementId())
        .isNotNull();
  }

  @Test
  void ac04_cashRefundAndCreditNoteApplyAllEffectsAtomically() throws Exception {
    Fixture fx = seed("ret-ac04");
    Stocked cashProduct = stocked(fx, "RET-4C", "Cash Pack", true);
    UUID cashInvoice = sell(fx, cashProduct, null, 4, "ret-4c");
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    returnJson(
                        cashInvoice, lineId(fx, cashInvoice), "1", "CASH", "Cash back", "sr-4c")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.cashRefundPaise").value(11200))
        .andExpect(jsonPath("$.data.creditNotePaise").value(0));
    assertThat(ledgerRepository.count()).isZero();

    Stocked noteProduct = stocked(fx, "RET-4N", "Note Pack", true);
    UUID customerId = createCustomer(fx.cookie(), "Return Patient", "9501000007");
    UUID noteInvoice = sell(fx, noteProduct, customerId, 4, "ret-4n");
    MvcResult confirmed =
        mockMvc
            .perform(
                post("/api/v1/sales/returns")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        returnJson(
                            noteInvoice,
                            lineId(fx, noteInvoice),
                            "2",
                            "CREDIT_NOTE",
                            "Store credit",
                            "sr-4n")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.refundMode").value("CREDIT_NOTE"))
            .andExpect(jsonPath("$.data.cashRefundPaise").value(0))
            .andExpect(jsonPath("$.data.creditNotePaise").value(22400))
            .andReturn();
    UUID returnId = idOf(confirmed);

    assertThat(
            ledgerRepository.findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
                fx.tenantId(), customerId))
        .filteredOn(entry -> entry.getType() == CustomerCreditLedgerType.CREDIT_NOTE)
        .singleElement()
        .satisfies(
            entry -> {
              assertThat(entry.getAmountPaise()).isEqualTo(22400L);
              assertThat(entry.getBalanceAfterPaise()).isEqualTo(-22400L);
              assertThat(entry.getInvoiceId()).isEqualTo(noteInvoice);
            });
    assertThat(
            creditAccountRepository
                .findByTenantIdAndCustomerId(fx.tenantId(), customerId)
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(-22400L);
    assertThat(floorQuantity(fx, noteProduct)).isEqualByComparingTo("8");
    assertThat(salesReturnRepository.findById(returnId).orElseThrow().getRefundTotalPaise())
        .isEqualTo(22400L);
  }

  @Test
  void ac05_isolationDuplicateAndPolicyFailuresAreRejected() throws Exception {
    Fixture fx = seed("ret-ac05");
    Stocked product = stocked(fx, "RET-5", "Guard Pack", true);
    UUID invoiceId = sell(fx, product, null, 4, "ret-5");
    UUID lineId = lineId(fx, invoiceId);

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Anon", "sr-5-anon")))
        .andExpect(status().isUnauthorized());

    MvcResult first =
        mockMvc
            .perform(
                post("/api/v1/sales/returns")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(returnJson(invoiceId, lineId, "1", "CASH", "Retry", "sr-5-key")))
            .andExpect(status().isOk())
            .andReturn();
    UUID returnId = idOf(first);
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Retry", "sr-5-key")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(returnId.toString()));
    assertThat(salesReturnRepository.count()).isEqualTo(1L);
    assertThat(floorQuantity(fx, product)).isEqualByComparingTo("7");
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "2", "CASH", "Retry", "sr-5-key")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));

    Stocked keepProduct = stocked(fx, "RET-5K", "Keep Pack", false);
    UUID keepInvoice = sell(fx, keepProduct, null, 4, "ret-5k");
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    returnJson(
                        keepInvoice,
                        lineId(fx, keepInvoice),
                        "1",
                        "CASH",
                        "Not allowed",
                        "sr-5-keep")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NOT_RETURNABLE"));

    Stocked staleProduct = stocked(fx, "RET-5X", "Stale Pack", true);
    UUID staleInvoice = sell(fx, staleProduct, null, 4, "ret-5x");
    StockBatch batch = stockBatchRepository.findById(staleProduct.batchId()).orElseThrow();
    batch.setManufacturedOn(LocalDate.of(2019, 1, 15));
    batch.setExpiresOn(LocalDate.of(2020, 1, 31));
    stockBatchRepository.saveAndFlush(batch);
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    returnJson(
                        staleInvoice,
                        lineId(fx, staleInvoice),
                        "1",
                        "CASH",
                        "Expired",
                        "sr-5-stale")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("BATCH_EXPIRED"));

    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    returnJson(
                        invoiceId, lineId, "1", "CREDIT_NOTE", "No khata", "sr-5-nocustomer")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CREDIT_NOTE_CUSTOMER_REQUIRED"));

    AppUser storeUser =
        persistUser(fx.tenantId(), "store@ret-ac05.local", AppUserRole.pharmacy_staff);
    UUID storeRole = createRole(fx.cookie(), "Store only", "[\"INVENTORY\"]");
    mockMvc
        .perform(
            put("/api/v1/users/" + storeUser.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + storeRole + "\"]}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/users/" + storeUser.getId() + "/branches")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + fx.branchId() + "\"]}"))
        .andExpect(status().isOk());
    Cookie storeCookie = login("store@ret-ac05.local");
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(storeCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + fx.branchId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(storeCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "No module", "sr-5-module")))
        .andExpect(status().isForbidden());

    Fixture other = seed("ret-ac05-other");
    mockMvc
        .perform(
            post("/api/v1/sales/returns")
                .cookie(other.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(invoiceId, lineId, "1", "CASH", "Foreign", "sr-5-foreign")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/sales/returns/" + returnId).cookie(other.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/sales/returns").cookie(other.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    Location secondBranch = persistBranch(fx.tenantId(), "Second", "BR02", false);
    mockMvc
        .perform(
            post("/api/v1/session/branch")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchId\":\"" + secondBranch.getId() + "\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/sales/returns/" + returnId).cookie(fx.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  private BigDecimal floorQuantity(Fixture fx, Stocked product) {
    return stockBalanceRepository
        .findByTenantIdAndBranchIdAndProductIdAndBatchId(
            fx.tenantId(), fx.branchId(), product.productId(), product.batchId())
        .orElseThrow()
        .getQuantity();
  }

  private UUID lineId(Fixture fx, UUID invoiceId) {
    return salesInvoiceLineRepository
        .findAllBySalesInvoiceIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
            invoiceId, fx.tenantId(), fx.branchId())
        .get(0)
        .getId();
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID sell(Fixture fx, Stocked product, UUID customerId, int quantity, String key)
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
    UUID invoiceId = idOf(created);
    long total = UNIT_TOTAL * quantity;
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/complete")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "expectedVersion":1,
                      "expectedTotalPaise":%d,
                      "changePaise":0,
                      "idempotencyKey":"%s-pay",
                      "payments":[{"mode":"CASH","amountPaise":%d}]
                    }
                    """
                        .formatted(total, key, total)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    return invoiceId;
  }

  private static String returnJson(
      UUID invoiceId,
      UUID lineId,
      String quantity,
      String refundMode,
      String reason,
      String idempotencyKey) {
    String key = idempotencyKey == null ? "null" : "\"" + idempotencyKey + "\"";
    return """
        {
          "salesInvoiceId":"%s",
          "reason":"%s",
          "decision":"APPROVED",
          "refundMode":"%s",
          "idempotencyKey":%s,
          "lines":[{"salesInvoiceLineId":"%s","quantity":%s}]
        }
        """
        .formatted(invoiceId, reason, refundMode, key, lineId, quantity);
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

  private Stocked stocked(Fixture fx, String sku, String name, boolean returnable)
      throws Exception {
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
                                .content(productJson(sku, name, categoryId, returnable)))
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
                    "{\"productId\":\"%s\",\"batchNumber\":\"LOT-%s\",\"manufacturedOn\":\"2026-01-15\",\"expiresOn\":\"2027-06-30\",\"purchasePricePaise\":12500,\"quantity\":\"10\",\"idempotencyKey\":\"%s-recv\",\"expectedVersion\":0}"
                        .formatted(productId, sku, sku)))
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
    Tenant tenant = persistTenant(tag, "Return " + tag);
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

  private static String productJson(String sku, String name, UUID categoryId, boolean returnable) {
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
          "isReturnable":%s,
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
        .formatted(sku, name, categoryId, returnable);
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
