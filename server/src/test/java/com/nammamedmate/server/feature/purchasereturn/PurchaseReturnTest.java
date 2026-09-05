package com.nammamedmate.server.feature.purchasereturn;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.GoodsReceiptLine;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.SupplierLedgerType;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.GoodsReceiptLineRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.PurchaseReturnRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
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

class PurchaseReturnTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private GoodsReceiptLineRepository goodsReceiptLineRepository;
  @Autowired private PurchaseReturnRepository purchaseReturnRepository;
  @Autowired private SupplierPayableAccountRepository payableAccountRepository;
  @Autowired private SupplierLedgerEntryRepository ledgerEntryRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_qcRejectionAutoCreatesReturnAndDebitNote() throws Exception {
    Fixture fx = seed("pr-ac01");
    PendingGrn grn = pendingGrn(fx, "10", 10000, "ac01");

    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "6", "4", "qc-part")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CHECKED"))
        .andExpect(jsonPath("$.data.purchaseReturnId").isNotEmpty())
        .andExpect(jsonPath("$.data.debitNoteNumber").value("DN/2026-27/BR01/00001"));

    mockMvc
        .perform(get("/api/v1/purchase-returns").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].origin").value("QC"))
        .andExpect(jsonPath("$.data.items[0].status").value("CONFIRMED"))
        .andExpect(jsonPath("$.data.items[0].amountPaise").value(40000));

    mockMvc
        .perform(get("/api/v1/suppliers/" + grn.supplierId() + "/ledger").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(60000))
        .andExpect(jsonPath("$.data.entries", hasSize(2)));

    assertThat(
            stockBalanceRepository
                .findAllByTenantIdAndBranchIdAndProductId(
                    fx.tenantId(), fx.branchId(), grn.productId())
                .get(0)
                .getQuantity())
        .isEqualByComparingTo("6");
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(row -> row.getTenantId().equals(fx.tenantId()))
                .toList())
        .hasSize(1)
        .first()
        .extracting(row -> row.getType())
        .isEqualTo(StockMovementType.STOCK_IN);
  }

  @Test
  void ac02_confirmedManualReturnReducesStockImmediately() throws Exception {
    Fixture fx = seed("pr-ac02");
    PendingGrn grn = pendingGrn(fx, "10", 10000, "ac02");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "10", "0", "qc-all")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.purchaseReturnId").value(org.hamcrest.Matchers.nullValue()));

    mockMvc
        .perform(
            post("/api/v1/purchase-returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(grn.receiptId(), grn.lineId(), "3", "ret-ac02")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.origin").value("MANUAL"))
        .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
        .andExpect(jsonPath("$.data.amountPaise").value(30000))
        .andExpect(jsonPath("$.data.lines[0].stockMovementId").isNotEmpty());

    assertThat(
            stockBalanceRepository
                .findAllByTenantIdAndBranchIdAndProductId(
                    fx.tenantId(), fx.branchId(), grn.productId())
                .get(0)
                .getQuantity())
        .isEqualByComparingTo("7");
    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(
                    row ->
                        row.getTenantId().equals(fx.tenantId())
                            && row.getType() == StockMovementType.PURCHASE_RETURN)
                .toList())
        .hasSize(1);
  }

  @Test
  void ac03_debitNoteReducesSupplierPayable() throws Exception {
    Fixture fx = seed("pr-ac03");
    PendingGrn grn = pendingGrn(fx, "10", 10000, "ac03");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "6", "4", "qc-dn")))
        .andExpect(status().isOk());

    assertThat(
            payableAccountRepository
                .findByTenantIdAndBranchIdAndSupplierId(
                    fx.tenantId(), fx.branchId(), grn.supplierId())
                .orElseThrow()
                .getBalancePaise())
        .isEqualTo(60000L);
    assertThat(
            ledgerEntryRepository
                .findAllByTenantIdAndBranchIdAndSupplierIdOrderByOccurredAtDesc(
                    fx.tenantId(), fx.branchId(), grn.supplierId())
                .stream()
                .map(row -> row.getType())
                .toList())
        .containsExactlyInAnyOrder(SupplierLedgerType.DEBIT_NOTE, SupplierLedgerType.INVOICE);
  }

  @Test
  void ac04_ledgerRecordsInvoiceDebitNotePaymentAndDueDate() throws Exception {
    Fixture fx = seed("pr-ac04", PlanCode.GROWTH);
    PendingGrn grn = pendingGrn(fx, "8", 5000, "ac04", "CREDIT", 30);
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "8", "0", "qc-led")))
        .andExpect(status().isOk());

    JsonNode ledger =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get("/api/v1/suppliers/" + grn.supplierId() + "/ledger").cookie(fx.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balancePaise").value(40000))
                .andExpect(jsonPath("$.data.entries[0].type").value("INVOICE"))
                .andExpect(jsonPath("$.data.entries[0].dueOn").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString());
    long version = ledger.path("data").path("version").asLong();

    mockMvc
        .perform(
            post("/api/v1/suppliers/" + grn.supplierId() + "/payments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payJson(15000, "UPI", "UPI-AC04", "pay-ac04", version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(25000))
        .andExpect(jsonPath("$.data.entries[0].type").value("PAYMENT"))
        .andExpect(jsonPath("$.data.entries[0].paymentMode").value("UPI"))
        .andExpect(jsonPath("$.data.entries[0].paymentReference").value("UPI-AC04"));

    mockMvc
        .perform(
            post("/api/v1/suppliers/" + grn.supplierId() + "/payments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payJson(15000, "UPI", "UPI-AC04", "pay-ac04", version)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.balancePaise").value(25000));
  }

  @Test
  void ac04_growthDueRemindersAreGated() throws Exception {
    Fixture free = seed("pr-due-free");
    PendingGrn freeGrn = pendingGrn(free, "5", 2000, "due-free");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + freeGrn.receiptId() + "/quality-check")
                .cookie(free.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(freeGrn.lineId(), "5", "0", "qc-free")))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/suppliers/dues").cookie(free.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

    Fixture growth = seed("pr-due-g", PlanCode.GROWTH);
    PendingGrn grn = pendingGrn(growth, "5", 2000, "due-g");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(growth.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "5", "0", "qc-g")))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/api/v1/suppliers/dues").cookie(growth.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].supplierId").value(grn.supplierId().toString()))
        .andExpect(jsonPath("$.data.items[0].overdue").value(true));
  }

  @Test
  void ac05_isolationAuthOverReturnOverpayDuplicateAndStaleFailClosed() throws Exception {
    Fixture fx = seed("pr-ac05");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    PendingGrn grn = pendingGrn(fx, "10", 10000, "ac05");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(qcJson(grn.lineId(), "10", "0", "qc-iso")))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/v1/purchase-returns")).andExpect(status().isUnauthorized());

    Cookie cashier = staffWithPredefined(fx, "cashier", "till@pr-ac05.local");
    mockMvc
        .perform(get("/api/v1/purchase-returns").cookie(cashier))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            post("/api/v1/purchase-returns")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(grn.receiptId(), grn.lineId(), "1", "ret-till")))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            post("/api/v1/purchase-returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(returnJson(grn.receiptId(), grn.lineId(), "11", "ret-over")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_RETURN"));

    JsonNode ledger =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get("/api/v1/suppliers/" + grn.supplierId() + "/ledger").cookie(fx.cookie()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    long version = ledger.path("data").path("version").asLong();

    mockMvc
        .perform(
            post("/api/v1/suppliers/" + grn.supplierId() + "/payments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payJson(200000, "CASH", "CASH-OVER", "pay-over", version)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVERPAYMENT"));

    mockMvc
        .perform(
            post("/api/v1/suppliers/" + grn.supplierId() + "/payments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payJson(10000, "UPI", "UPI-DUP", "pay-dup-1", version)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/suppliers/" + grn.supplierId() + "/payments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payJson(5000, "UPI", "UPI-DUP", "pay-dup-2", version + 1)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("DUPLICATE_REFERENCE"));

    mockMvc
        .perform(
            post("/api/v1/suppliers/" + grn.supplierId() + "/payments")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payJson(5000, "CASH", "CASH-STALE", "pay-stale", 0)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));

    Tenant other = persistTenant("other-pr", "Other PR");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@other-pr.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "BR01", true);
    Cookie otherCookie = login("owner@other-pr.local");
    selectBranch(otherCookie, otherBranch.getId());
    UUID returnId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/purchase-returns")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(returnJson(grn.receiptId(), grn.lineId(), "1", "ret-iso")))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(get("/api/v1/purchase-returns/" + returnId).cookie(otherCookie))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/suppliers/" + grn.supplierId() + "/ledger").cookie(otherCookie))
        .andExpect(status().isNotFound());

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/purchase-returns").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
    selectBranch(fx.cookie(), fx.branchId());

    mockMvc
        .perform(
            post("/api/v1/purchase-returns")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void ac01_qcReplayDoesNotDoublePostPayable() throws Exception {
    Fixture fx = seed("pr-replay");
    PendingGrn grn = pendingGrn(fx, "10", 10000, "replay");
    String body = qcJson(grn.lineId(), "6", "4", "qc-once");
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/goods-receipts/" + grn.receiptId() + "/quality-check")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.debitNoteNumber").value("DN/2026-27/BR01/00001"));
    assertThat(purchaseReturnRepository.findAll()).hasSize(1);
    assertThat(
            ledgerEntryRepository.findAllByTenantIdAndBranchIdAndSupplierIdOrderByOccurredAtDesc(
                fx.tenantId(), fx.branchId(), grn.supplierId()))
        .hasSize(2);
  }

  private PendingGrn pendingGrn(Fixture fx, String qty, long rate, String key) throws Exception {
    return pendingGrn(fx, qty, rate, key, "COD", null);
  }

  private PendingGrn pendingGrn(
      Fixture fx, String qty, long rate, String key, String terms, Integer creditDays)
      throws Exception {
    UUID supplierId = createSupplier(fx.cookie(), "SUP-" + key, terms, creditDays);
    UUID productId = createProduct(fx.cookie(), "SKU-" + key, "Pack " + key);
    UUID poId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPoJson(supplierId, productId, qty, rate, "po-" + key)))
                .andExpect(status().isOk())
                .andReturn());
    mockMvc
        .perform(
            post("/api/v1/purchase-orders/" + poId + "/issue")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":1}"))
        .andExpect(status().isOk());
    UUID poLineId = poLineIdOf(fx.cookie(), poId);
    UUID receiptId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders/" + poId + "/receipts")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiptJson("CH-" + key, "grn-" + key, poLineId, qty, rate)))
                .andExpect(status().isOk())
                .andReturn());
    GoodsReceiptLine line =
        goodsReceiptLineRepository
            .findAllByGoodsReceiptIdAndTenantIdAndBranchIdOrderBySortOrderAsc(
                receiptId, fx.tenantId(), fx.branchId())
            .get(0);
    return new PendingGrn(receiptId, line.getId(), productId, supplierId);
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

  private UUID poLineIdOf(Cookie cookie, UUID poId) throws Exception {
    String body =
        mockMvc
            .perform(get("/api/v1/purchase-orders/" + poId).cookie(cookie))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(
        objectMapper.readTree(body).path("data").path("lines").get(0).path("id").asText());
  }

  private UUID createProduct(Cookie cookie, String sku, String name) throws Exception {
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"" + sku + " cat\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    String body =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID createSupplier(Cookie cookie, String code, String terms, Integer creditDays)
      throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/suppliers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(supplierJson(code, terms, creditDays)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
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
    return seed(tag, PlanCode.FREE);
  }

  private Fixture seed(String tag, PlanCode plan) throws Exception {
    Tenant tenant = persistTenant(tag, "PR " + tag);
    persistPlan(tenant.getId(), plan);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
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

  private static String qcJson(UUID lineId, String accepted, String rejected, String key) {
    return """
        {
          "idempotencyKey":"%s",
          "visualInspectionPassed":true,
          "checklist":{
            "packagingIntact":true,
            "labelMatches":true,
            "batchReadable":true,
            "noDamage":true
          },
          "lines":[{
            "goodsReceiptLineId":"%s",
            "acceptedQuantity":%s,
            "rejectedQuantity":%s,
            "batchNumber":"LOT-PR",
            "manufacturedOn":"2026-01-15",
            "expiresOn":"2027-12-31"
          }]
        }
        """
        .formatted(key, lineId, accepted, rejected);
  }

  private static String returnJson(UUID receiptId, UUID lineId, String qty, String key) {
    return """
        {
          "goodsReceiptId":"%s",
          "idempotencyKey":"%s",
          "lines":[{"goodsReceiptLineId":"%s","quantity":%s}]
        }
        """
        .formatted(receiptId, key, lineId, qty);
  }

  private static String payJson(
      long amount, String mode, String reference, String key, long version) {
    return """
        {
          "amountPaise":%d,
          "mode":"%s",
          "reference":"%s",
          "idempotencyKey":"%s",
          "expectedAccountVersion":%d
        }
        """
        .formatted(amount, mode, reference, key, version);
  }

  private static String receiptJson(
      String reference, String key, UUID lineId, String qty, long rate) {
    return """
        {
          "receiptReference":"%s",
          "idempotencyKey":"%s",
          "lines":[{"purchaseOrderLineId":"%s","quantity":%s,"unitRatePaise":%d}]
        }
        """
        .formatted(reference, key, lineId, qty, rate);
  }

  private static String createPoJson(
      UUID supplierId, UUID productId, String qty, long rate, String key) {
    return """
        {
          "supplierId":"%s",
          "expectedDeliveryDate":"2026-09-20",
          "paymentTerms":"CREDIT",
          "notes":"Weekly indent",
          "idempotencyKey":"%s",
          "lines":[{"productId":"%s","quantity":%s,"unitRatePaise":%d}]
        }
        """
        .formatted(supplierId, key, productId, qty, rate);
  }

  private static String supplierJson(String code, String terms, Integer creditDays) {
    return """
        {
          "supplierCode":"%s",
          "legalName":"Acme Pharma Pvt Ltd",
          "tradeName":null,
          "supplierType":"DISTRIBUTOR",
          "gstin":null,
          "pan":null,
          "drugLicenseNumber":null,
          "drugLicenseType":null,
          "drugLicenseExpiry":null,
          "fssaiLicenseNumber":null,
          "contactPersonName":"Ramesh Rao",
          "contactPersonRole":null,
          "phone":"9876500001",
          "alternatePhone":null,
          "email":null,
          "website":null,
          "addressLine1":"12 MG Road",
          "addressLine2":null,
          "city":"Bengaluru",
          "state":"KA",
          "pincode":"560001",
          "country":"India",
          "paymentTerms":"%s",
          "creditPeriodDays":%s,
          "creditLimitPaise":null,
          "bankName":null,
          "accountHolderName":null,
          "accountNumber":null,
          "confirmAccountNumber":null,
          "ifscCode":null,
          "upiId":null,
          "categoryIds":[],
          "status":"ACTIVE",
          "notes":null
        }
        """
        .formatted(code, terms, creditDays == null ? "null" : creditDays.toString());
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
          "taxCategory":null,
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

  private record PendingGrn(UUID receiptId, UUID lineId, UUID productId, UUID supplierId) {}
}
