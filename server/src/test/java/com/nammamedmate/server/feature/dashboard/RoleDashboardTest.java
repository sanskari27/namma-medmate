package com.nammamedmate.server.feature.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
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
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.CustomerCreditAccount;
import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import com.nammamedmate.server.domain.CustomerCreditLedgerType;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.DiscountType;
import com.nammamedmate.server.domain.EinvoiceApplicability;
import com.nammamedmate.server.domain.EinvoiceStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.domain.SalesInvoiceStatus;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Supplier;
import com.nammamedmate.server.domain.SupplierLedgerEntry;
import com.nammamedmate.server.domain.SupplierLedgerType;
import com.nammamedmate.server.domain.SupplierPayableAccount;
import com.nammamedmate.server.domain.SupplierPaymentTerms;
import com.nammamedmate.server.domain.SupplierStatus;
import com.nammamedmate.server.domain.SupplierType;
import com.nammamedmate.server.domain.TaxJurisdiction;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerCreditAccountRepository;
import com.nammamedmate.server.persistence.CustomerCreditLedgerEntryRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import com.nammamedmate.server.persistence.SupplierLedgerEntryRepository;
import com.nammamedmate.server.persistence.SupplierPayableAccountRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
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

class RoleDashboardTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-06T02:00:00Z");
  private static final long TOTAL = 11_200L;
  private static final long COST = 5_000L;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SalesInvoiceRepository salesInvoiceRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private CustomerCreditAccountRepository creditAccountRepository;
  @Autowired private CustomerCreditLedgerEntryRepository creditLedgerRepository;
  @Autowired private SupplierRepository supplierRepository;
  @Autowired private SupplierPayableAccountRepository payableAccountRepository;
  @Autowired private SupplierLedgerEntryRepository supplierLedgerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_cashierSeesTodaySalesAndHoldsNotFinanceOrInventory() throws Exception {
    Fixture fx = seed("dash-ac01");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "DASH-1", "Till Pack", null);
    completeCash(fx, createDraft(fx, product, "dash-1"), 1, "dash-1-c");
    UUID heldId = createDraft(fx, product, "dash-1-h");
    hold(fx.cookie(), heldId, 1);
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@dash-ac01.local");
    Cookie inventory = staffWithPredefined(fx, "inventory", "stock@dash-ac01.local");

    mockMvc
        .perform(get("/api/v1/dashboards/cashier").cookie(cashier))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.role").value("cashier"))
        .andExpect(jsonPath("$.data.scope").value("branch"))
        .andExpect(jsonPath("$.data.branchId").value(fx.branchId().toString()))
        .andExpect(jsonPath("$.data.permittedRoles", hasItem("cashier")))
        .andExpect(jsonPath("$.data.permittedRoles", not(hasItem("accountant"))))
        .andExpect(jsonPath("$.data.cashier.todaySalesPaise").value((int) TOTAL))
        .andExpect(jsonPath("$.data.cashier.todayBillCount").value(1))
        .andExpect(jsonPath("$.data.cashier.holds", hasSize(1)))
        .andExpect(jsonPath("$.data.cashier.holds[0].id").value(heldId.toString()))
        .andExpect(jsonPath("$.data.cashier.sources.sales").value("/pos"))
        .andExpect(jsonPath("$.data.cashier.sources.holds").value("/pos"))
        .andExpect(jsonPath("$.data.inventory").doesNotExist())
        .andExpect(jsonPath("$.data.accountant").doesNotExist())
        .andExpect(jsonPath("$.data.owner").doesNotExist());

    mockMvc
        .perform(get("/api/v1/dashboards/accountant").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    mockMvc
        .perform(get("/api/v1/dashboards/inventory").cookie(cashier))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            get("/api/v1/dashboards/cashier")
                .param("branchId", annex.getId().toString())
                .cookie(cashier))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    mockMvc
        .perform(get("/api/v1/dashboards/cashier").cookie(inventory))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac02_inventorySeesLowStockPendingTransfersAndGrnWithSourceLinks() throws Exception {
    Fixture fx = seed("dash-ac02");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "DASH-2", "Low Pack", 50);
    mockMvc
        .perform(
            post("/api/v1/stock-transfers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    transferJson(
                        "PUSH",
                        annex.getId(),
                        product.productId(),
                        product.batchId(),
                        "2",
                        "dash-2-t")))
        .andExpect(status().isOk());
    UUID receiptId = pendingGrn(fx, "4", 8000, "ac02");
    Cookie inventory = staffWithPredefined(fx, "inventory", "stock@dash-ac02.local");

    mockMvc
        .perform(get("/api/v1/dashboards/inventory").cookie(inventory))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.role").value("inventory"))
        .andExpect(jsonPath("$.data.inventory.lowStock", hasSize(1)))
        .andExpect(jsonPath("$.data.inventory.lowStock[0].productName").value("Low Pack"))
        .andExpect(jsonPath("$.data.inventory.pendingTransfers", hasSize(1)))
        .andExpect(jsonPath("$.data.inventory.pendingTransfers[0].status").value("IN_TRANSIT"))
        .andExpect(jsonPath("$.data.inventory.pendingTransfers[0].href").value("/inventory"))
        .andExpect(jsonPath("$.data.inventory.pendingGrn", hasSize(1)))
        .andExpect(jsonPath("$.data.inventory.pendingGrn[0].id").value(receiptId.toString()))
        .andExpect(jsonPath("$.data.inventory.pendingGrn[0].href").value("/purchases"))
        .andExpect(jsonPath("$.data.inventory.sources.stock").value("/inventory"))
        .andExpect(jsonPath("$.data.cashier").doesNotExist())
        .andExpect(jsonPath("$.data.accountant").doesNotExist());
  }

  @Test
  void ac03_accountantSeesArApAndExpensesWithoutTillOrCompliance() throws Exception {
    Fixture fx = seed("dash-ac03");
    Customer customer = persistCustomer(fx.tenantId(), "Khata Buyer", "9801000101");
    persistCredit(
        fx,
        customer,
        12_000L,
        persistInvoice(fx.tenantId(), fx.branchId(), fx.userId(), customer.getId()),
        Instant.parse("2026-09-01T04:00:00Z"));
    Supplier stockist = persistSupplier(fx.tenantId(), "SUP-D03", "Acme Stockist");
    persistPayable(fx, fx.branchId(), stockist, 8_000L, Instant.parse("2026-09-01T04:00:00Z"));
    postRent(fx, 15_000L, "dash-3-rent");
    Cookie accountant = staffWithPredefined(fx, "accountant", "books@dash-ac03.local");
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@dash-ac03.local");

    mockMvc
        .perform(get("/api/v1/dashboards/accountant").cookie(accountant))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.role").value("accountant"))
        .andExpect(jsonPath("$.data.accountant.receivablesTotalPaise").value(12_000))
        .andExpect(jsonPath("$.data.accountant.payablesTotalPaise").value(8_000))
        .andExpect(jsonPath("$.data.accountant.expenseTotalPaise").value(15_000))
        .andExpect(jsonPath("$.data.accountant.sources.aging").value("/aging"))
        .andExpect(jsonPath("$.data.accountant.sources.expenses").value("/expenses"))
        .andExpect(jsonPath("$.data.cashier").doesNotExist())
        .andExpect(jsonPath("$.data.inventory").doesNotExist())
        .andExpect(jsonPath("$.data.owner").doesNotExist());

    mockMvc
        .perform(get("/api/v1/dashboards/cashier").cookie(accountant))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/dashboards/accountant").cookie(cashier))
        .andExpect(status().isForbidden());
  }

  @Test
  void ac04_ownerSeesTenantConsolidationWithBranchFilterAndDrillDown() throws Exception {
    Fixture fx = seed("dash-ac04");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    Stocked product = stocked(fx, "DASH-4", "Owner Pack", null);
    completeCash(fx, createDraft(fx, product, "dash-4"), 1, "dash-4-c");
    postRent(fx, 4_000L, "dash-4-rent");

    mockMvc
        .perform(get("/api/v1/dashboards/owner").param("scope", "tenant").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.role").value("owner"))
        .andExpect(jsonPath("$.data.scope").value("tenant"))
        .andExpect(jsonPath("$.data.permittedRoles", hasItem("owner")))
        .andExpect(jsonPath("$.data.permittedRoles", hasItem("cashier")))
        .andExpect(jsonPath("$.data.owner.todaySalesPaise").value((int) TOTAL))
        .andExpect(jsonPath("$.data.owner.branches", hasSize(2)))
        .andExpect(jsonPath("$.data.owner.branches[*].name", hasItem("Main")))
        .andExpect(jsonPath("$.data.owner.branches[*].name", hasItem("Annex")))
        .andExpect(jsonPath("$.data.owner.expenseTotalPaise").value(4_000))
        .andExpect(jsonPath("$.data.owner.sources.sales").value("/pos"))
        .andExpect(jsonPath("$.data.owner.sources.stock").value("/inventory"))
        .andExpect(jsonPath("$.data.owner.sources.aging").value("/aging"))
        .andExpect(jsonPath("$.data.owner.sources.expenses").value("/expenses"))
        .andExpect(jsonPath("$.data.cashier").doesNotExist());

    mockMvc
        .perform(
            get("/api/v1/dashboards/owner")
                .param("branchId", annex.getId().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.scope").value("branch"))
        .andExpect(jsonPath("$.data.branchId").value(annex.getId().toString()))
        .andExpect(jsonPath("$.data.owner.todaySalesPaise").value(0))
        .andExpect(jsonPath("$.data.owner.branches", hasSize(1)));
  }

  @Test
  void ac05_multiRoleUserSwitchesDesksWithoutDuplicateWidgets() throws Exception {
    Fixture fx = seed("dash-ac05");
    Stocked product = stocked(fx, "DASH-5", "Both Pack", 40);
    completeCash(fx, createDraft(fx, product, "dash-5"), 1, "dash-5-c");
    Cookie both = staffWithRoles(fx, "floor@dash-ac05.local", "cashier", "inventory");

    mockMvc
        .perform(get("/api/v1/dashboards/cashier").cookie(both))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.permittedRoles", hasItem("cashier")))
        .andExpect(jsonPath("$.data.permittedRoles", hasItem("inventory")))
        .andExpect(jsonPath("$.data.permittedRoles", hasSize(2)))
        .andExpect(jsonPath("$.data.cashier.todaySalesPaise").value((int) TOTAL))
        .andExpect(jsonPath("$.data.inventory").doesNotExist())
        .andExpect(jsonPath("$.data.accountant").doesNotExist());

    mockMvc
        .perform(get("/api/v1/dashboards/inventory").cookie(both))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.inventory.lowStock", hasSize(1)))
        .andExpect(jsonPath("$.data.cashier").doesNotExist());
  }

  @Test
  void ac06_isolationValidationAndUnsupportedRoleDiscloseNothing() throws Exception {
    Fixture fx = seed("dash-ac06");
    Stocked product = stocked(fx, "DASH-6", "Iso Pack", null);
    completeCash(fx, createDraft(fx, product, "dash-6"), 1, "dash-6-c");
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "rx@dash-ac06.local");
    Cookie cashierNoOutlet = staffWithoutBranch(fx, "cashier", "noshop@dash-ac06.local");
    Fixture other = seed("dash-ac06b");

    mockMvc.perform(get("/api/v1/dashboards/cashier")).andExpect(status().isUnauthorized());
    mockMvc
        .perform(get("/api/v1/dashboards/pharmacist").cookie(pharmacist))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    mockMvc
        .perform(get("/api/v1/dashboards/owner").cookie(pharmacist))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/dashboards/cashier").param("scope", "tenant").cookie(pharmacist))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    mockMvc
        .perform(
            get("/api/v1/dashboards/cashier").param("branchId", "not-a-uuid").cookie(fx.cookie()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    mockMvc
        .perform(
            get("/api/v1/dashboards/owner")
                .param("branchId", other.branchId().toString())
                .cookie(fx.cookie()))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/v1/dashboards/cashier").cookie(cashierNoOutlet))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("NO_ACTIVE_BRANCH"));
    mockMvc
        .perform(get("/api/v1/dashboards/cashier").cookie(other.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.cashier.todaySalesPaise").value(0))
        .andExpect(jsonPath("$.data.cashier.todayBillCount").value(0));
  }

  private UUID pendingGrn(Fixture fx, String qty, long rate, String key) throws Exception {
    UUID supplierId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/suppliers")
                                .cookie(fx.cookie())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(supplierJson("SUP-" + key)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    Stocked product = stocked(fx, "SKU-" + key, "Pack " + key, null);
    UUID poId =
        idOf(
            mockMvc
                .perform(
                    post("/api/v1/purchase-orders")
                        .cookie(fx.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            createPoJson(supplierId, product.productId(), qty, rate, "po-" + key)))
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
    return idOf(
        mockMvc
            .perform(
                post("/api/v1/purchase-orders/" + poId + "/receipts")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(receiptJson("CH-" + key, "grn-" + key, poLineId, qty, rate)))
            .andExpect(status().isOk())
            .andReturn());
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

  private void hold(Cookie cookie, UUID invoiceId, int version) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/sales/invoices/" + invoiceId + "/hold")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"expectedVersion\":" + version + "}"))
        .andExpect(status().isOk());
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
    return idOf(
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
            .andReturn());
  }

  private Stocked stocked(Fixture fx, String sku, String name, Integer reorderLevel)
      throws Exception {
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
                        .content(productJson(sku, name, categoryId, reorderLevel)))
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

  private void postRent(Fixture fx, long amountPaise, String key) throws Exception {
    String cats =
        mockMvc
            .perform(get("/api/v1/finance/expense-categories").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID rentId = null;
    for (JsonNode cat : objectMapper.readTree(cats).path("data").path("items")) {
      if ("RENT".equals(cat.path("code").asText())) {
        rentId = UUID.fromString(cat.path("id").asText());
      }
    }
    assertThat(rentId).isNotNull();
    mockMvc
        .perform(
            post("/api/v1/finance/expenses")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "categoryId":"%s",
                      "amountPaise":%d,
                      "occurredOn":"2026-09-01",
                      "notes":"Shop rent",
                      "branchId":null,
                      "idempotencyKey":"%s"
                    }
                    """
                        .formatted(rentId, amountPaise, key)))
        .andExpect(status().isOk());
  }

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    return staffWithRoles(fx, email, roleCode);
  }

  private Cookie staffWithRoles(Fixture fx, String email, String... roleCodes) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    StringBuilder ids = new StringBuilder("[");
    for (int i = 0; i < roleCodes.length; i++) {
      if (i > 0) {
        ids.append(',');
      }
      ids.append('"').append(predefinedId(fx.cookie(), roleCodes[i])).append('"');
    }
    ids.append(']');
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":" + ids + "}"))
        .andExpect(status().isOk());
    assignBranch(fx.cookie(), staff.getId(), fx.branchId());
    Cookie cookie = login(email);
    selectBranch(cookie, fx.branchId());
    return cookie;
  }

  private Cookie staffWithoutBranch(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedId(fx.cookie(), roleCode);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    return login(email);
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
    Tenant tenant = persistTenant(tag, "Dash " + tag);
    persistPlan(tenant.getId(), PlanCode.GROWTH);
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
    customer.setCreatedAt(T0);
    customer.setUpdatedAt(T0);
    return customerRepository.saveAndFlush(customer);
  }

  private UUID persistInvoice(UUID tenantId, UUID branchId, UUID userId, UUID customerId) {
    SalesInvoice invoice = new SalesInvoice();
    invoice.setId(UUID.randomUUID());
    invoice.setTenantId(tenantId);
    invoice.setBranchId(branchId);
    invoice.setInvoiceNumber("INV/2026-27/BR01/" + invoice.getId().toString().substring(0, 5));
    invoice.setStatus(SalesInvoiceStatus.COMPLETED);
    invoice.setStaffUserId(userId);
    invoice.setTerminalId(UUID.randomUUID());
    invoice.setCustomerId(customerId);
    invoice.setSubtotalPaise(0);
    invoice.setDiscountPaise(0);
    invoice.setTaxPaise(0);
    invoice.setTotalPaise(0);
    invoice.setBillDiscountType(DiscountType.NONE);
    invoice.setBillDiscountValue(0);
    invoice.setTaxJurisdiction(TaxJurisdiction.INTRA);
    invoice.setDiscountApprovalStatus(DiscountApprovalStatus.NOT_REQUIRED);
    invoice.setEinvoiceApplicability(EinvoiceApplicability.NOT_APPLICABLE);
    invoice.setEinvoiceStatus(EinvoiceStatus.NOT_SUBMITTED);
    invoice.setIdempotencyKey("inv-" + invoice.getId());
    invoice.setVersion(1);
    invoice.setCreatedAt(T0);
    invoice.setUpdatedAt(T0);
    return salesInvoiceRepository.saveAndFlush(invoice).getId();
  }

  private void persistCredit(
      Fixture fx, Customer customer, long amountPaise, UUID invoiceId, Instant occurredAt) {
    CustomerCreditAccount account = new CustomerCreditAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(fx.tenantId());
    account.setCustomerId(customer.getId());
    account.setLimitPaise(1_000_000L);
    account.setBalancePaise(amountPaise);
    account.setVersion(1);
    account.setCreatedAt(occurredAt);
    account.setUpdatedAt(occurredAt);
    creditAccountRepository.saveAndFlush(account);
    CustomerCreditLedgerEntry entry = new CustomerCreditLedgerEntry();
    entry.setId(UUID.randomUUID());
    entry.setTenantId(fx.tenantId());
    entry.setCustomerId(customer.getId());
    entry.setAccountId(account.getId());
    entry.setType(CustomerCreditLedgerType.SALE_CHARGE);
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(amountPaise);
    entry.setInvoiceId(invoiceId);
    entry.setIdempotencyKey("chg-" + entry.getId());
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    creditLedgerRepository.saveAndFlush(entry);
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

  private void persistPayable(
      Fixture fx, UUID branchId, Supplier supplier, long amountPaise, Instant occurredAt) {
    SupplierPayableAccount account = new SupplierPayableAccount();
    account.setId(UUID.randomUUID());
    account.setTenantId(fx.tenantId());
    account.setBranchId(branchId);
    account.setSupplierId(supplier.getId());
    account.setBalancePaise(amountPaise);
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
    entry.setAmountPaise(amountPaise);
    entry.setBalanceAfterPaise(amountPaise);
    entry.setDueOn(LocalDate.of(2026, 9, 1));
    entry.setIdempotencyKey("inv-" + entry.getId());
    entry.setCreatedByUserId(fx.userId());
    entry.setOccurredAt(occurredAt);
    entry.setCreatedAt(occurredAt);
    supplierLedgerRepository.saveAndFlush(entry);
  }

  private UUID idOf(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private static String transferJson(
      String direction, UUID counterparty, UUID productId, UUID batchId, String qty, String key) {
    return """
        {"direction":"%s","counterpartyBranchId":"%s","lines":[{"productId":"%s","batchId":"%s","quantity":%s}],"idempotencyKey":"%s"}
        """
        .formatted(direction, counterparty, productId, batchId, qty, key);
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

  private static String supplierJson(String code) {
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
          "paymentTerms":"COD",
          "creditPeriodDays":null,
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
        .formatted(code);
  }

  private static String productJson(
      String sku, String name, UUID categoryId, Integer reorderLevel) {
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
          "reorderLevel":%s,
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
        .formatted(sku, name, categoryId, reorderLevel == null ? "null" : reorderLevel.toString());
  }

  private record Fixture(UUID tenantId, UUID branchId, UUID userId, Cookie cookie) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
