package com.nammamedmate.server.feature.compliance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.StockMovementType;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ApprovalDecisionRepository;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import com.nammamedmate.server.persistence.ApprovalRuleRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.ControlledStockRegisterRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.NotificationDeliveryRepository;
import com.nammamedmate.server.persistence.NotificationEventRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.NotificationSourceRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockAdjustmentRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.StockTransferLineRepository;
import com.nammamedmate.server.persistence.StockTransferRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class ControlledStockTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T10:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private ProductCategoryRepository productCategoryRepository;
  @Autowired private ManufacturerRepository manufacturerRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private ControlledStockRegisterRepository controlledStockRegisterRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private DoctorRepository doctorRepository;
  @Autowired private StockTransferRepository stockTransferRepository;
  @Autowired private StockTransferLineRepository stockTransferLineRepository;
  @Autowired private StockAdjustmentRepository stockAdjustmentRepository;
  @Autowired private ApprovalRuleRepository approvalRuleRepository;
  @Autowired private ApprovalRequestRepository approvalRequestRepository;
  @Autowired private ApprovalDecisionRepository approvalDecisionRepository;
  @Autowired private NotificationDeliveryRepository notificationDeliveryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationEventRepository notificationEventRepository;
  @Autowired private NotificationSourceRepository notificationSourceRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    notificationDeliveryRepository.deleteAll();
    notificationRepository.deleteAll();
    notificationEventRepository.deleteAll();
    notificationSourceRepository.deleteAll();
    auditEventRepository.deleteAll();
    approvalDecisionRepository.deleteAll();
    stockTransferLineRepository.deleteAll();
    stockTransferRepository.deleteAll();
    stockAdjustmentRepository.deleteAll();
    approvalRequestRepository.deleteAll();
    approvalRuleRepository.deleteAll();
    controlledStockRegisterRepository.deleteAll();
    stockMovementRepository.deleteAll();
    stockBalanceRepository.deleteAll();
    stockBatchRepository.deleteAll();
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    doctorRepository.deleteAll();
    customerRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    userBranchRepository.deleteAll();
    accessRoleRepository
        .findByKind(AccessRoleKind.CUSTOM)
        .forEach(
            role -> {
              accessRoleModuleRepository.deleteAll(
                  accessRoleModuleRepository.findByRoleIdIn(List.of(role.getId())));
              accessRoleRepository.delete(role);
            });
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_ownerAndPharmacistVerifyPrescriptionForControlledDispense() throws Exception {
    Fixture fx = seed("ac01");
    UUID productId = createControlledProduct(fx.cookie(), "SKU-H1", "Alprazolam", "H1");
    UUID customerId = createCustomer(fx.cookie(), "Ravi", "9876500101");
    UUID doctorId = createDoctor(fx.cookie(), "Dr. Mehta", "KA-1001");

    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-stock/verify")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(customerId, doctorId, true, "RX-1", List.of(productId))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.allowed").value(true))
        .andExpect(jsonPath("$.data.controlledProductIds", hasItem(productId.toString())))
        .andExpect(jsonPath("$.data.schedules['" + productId + "']").value("H1"));

    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "rx@ac01.local");
    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-stock/verify")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(customerId, doctorId, true, "RX-2", List.of(productId))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.allowed").value(true));
  }

  @Test
  void ac02_cashierOnlyCannotDispenseControlledProducts() throws Exception {
    Fixture fx = seed("ac02");
    UUID productId = createControlledProduct(fx.cookie(), "SKU-X", "Morphine", "X");
    UUID customerId = createCustomer(fx.cookie(), "Meera", "9876500102");
    UUID doctorId = createDoctor(fx.cookie(), "Dr. Rao", "KA-1002");
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@ac02.local");

    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-stock/verify")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(customerId, doctorId, true, "RX-C", List.of(productId))))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("PHARMACIST_REQUIRED"));
  }

  @Test
  void ac03_eachMovementFeedsSeparateControlledRegister() throws Exception {
    Fixture fx = seedTwoBranches("ac03");
    UUID productId = createControlledProduct(fx.cookie(), "SKU-NDPS", "Codeine syrup", "NDPS");
    MvcResult received =
        mockMvc
            .perform(
                post("/api/v1/inventory/receipts")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        receiptJson(
                            productId,
                            "LOT-N",
                            "2026-01-01",
                            "2027-01-01",
                            15000,
                            "20",
                            "n-in",
                            0)))
            .andExpect(status().isOk())
            .andReturn();
    UUID batchId =
        UUID.fromString(
            objectMapper
                .readTree(received.getResponse().getContentAsString())
                .path("data")
                .path("batchId")
                .asText());
    long version =
        objectMapper
            .readTree(received.getResponse().getContentAsString())
            .path("data")
            .path("version")
            .asLong();

    mockMvc
        .perform(
            post("/api/v1/inventory/issues")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchId":"%s","quantity":2,"idempotencyKey":"n-out","expectedVersion":%d}
                    """
                        .formatted(productId, batchId, version)))
        .andExpect(status().isOk());

    MvcResult pushed =
        mockMvc
            .perform(
                post("/api/v1/stock-transfers")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(transferJson("PUSH", fx.branchB(), productId, batchId, "3", "n-push")))
            .andExpect(status().isOk())
            .andReturn();
    UUID transferId =
        UUID.fromString(
            objectMapper
                .readTree(pushed.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(post("/api/v1/stock-transfers/" + transferId + "/confirm").cookie(fx.cookie()))
        .andExpect(status().isOk());

    selectBranch(fx.cookie(), fx.branchA());
    createWriteOffRule(fx.cookie());
    MvcResult adj =
        mockMvc
            .perform(
                post("/api/v1/inventory/adjustments")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"productId":"%s","batchId":"%s","reason":"THEFT_LOSS","quantity":1,"direction":"OUT","idempotencyKey":"n-adj"}
                        """
                            .formatted(productId, batchId)))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode adjData = objectMapper.readTree(adj.getResponse().getContentAsString()).path("data");
    mockMvc
        .perform(
            post("/api/v1/inventory/adjustments/" + adjData.path("id").asText() + "/decide")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"outcome":"APPROVED","expectedVersion":%d,"note":"counted"}
                    """
                        .formatted(adjData.path("version").asInt())))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/compliance/controlled-stock").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[*].movementType", hasItem("STOCK_IN")))
        .andExpect(jsonPath("$.data.items[*].movementType", hasItem("STOCK_OUT")))
        .andExpect(jsonPath("$.data.items[*].movementType", hasItem("TRANSFER_OUT")))
        .andExpect(jsonPath("$.data.items[*].movementType", hasItem("ADJUSTMENT_OUT")))
        .andExpect(jsonPath("$.data.items[0].productName").value("Codeine syrup"))
        .andExpect(jsonPath("$.data.items[0].scheduleClassification").value("NDPS"))
        .andExpect(jsonPath("$.data.items[0].batchNumber").value("LOT-N"));

    selectBranch(fx.cookie(), fx.branchB());
    mockMvc
        .perform(get("/api/v1/compliance/controlled-stock").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[*].movementType", hasItem("TRANSFER_IN")));

    assertThat(
            stockMovementRepository.findAll().stream()
                .filter(m -> m.getType() == StockMovementType.STOCK_IN)
                .count())
        .isEqualTo(1);
    assertThat(controlledStockRegisterRepository.count()).isGreaterThanOrEqualTo(5);
  }

  @Test
  void ac04_governmentNdpsAndGeneralExportStayTraceable() throws Exception {
    Fixture fx = seed("ac04");
    UUID productId = createControlledProduct(fx.cookie(), "SKU-H", "Diazepam", "H");
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    receiptJson(
                        productId, "LOT-H", "2026-02-01", "2027-02-01", 8000, "8", "h-in", 0)))
        .andExpect(status().isOk());

    String csv =
        mockMvc
            .perform(
                get("/api/v1/compliance/controlled-stock/export?format=csv").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("text/csv"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(csv).contains("occurred_at,movement_type,product_name,sku,schedule");
    assertThat(csv).contains("Diazepam");
    assertThat(csv).contains("STOCK_IN");
    assertThat(csv).contains("LOT-H");

    String ndps =
        mockMvc
            .perform(
                get("/api/v1/compliance/controlled-stock/export?format=ndps").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("text/csv"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(ndps).contains("date_ist,particulars,opening_qty,receipt_qty,issue_qty,closing_qty");
    assertThat(ndps).contains("Diazepam");
    assertThat(ndps).contains("H");
  }

  @Test
  void ac05_missingVerificationWrongRoleIncompleteDataAlteredScopeFailSafely() throws Exception {
    Fixture fx = seed("ac05");
    UUID productId = createControlledProduct(fx.cookie(), "SKU-H1b", "Clonazepam", "H1");
    UUID customerId = createCustomer(fx.cookie(), "Anita", "9876500105");
    UUID doctorId = createDoctor(fx.cookie(), "Dr. Iyer", "KA-1005");

    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-stock/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(customerId, doctorId, true, "RX", List.of(productId))))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-stock/verify")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(null, doctorId, true, "RX", List.of(productId))))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_CONTROLLED"));

    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-stock/verify")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(customerId, null, true, "RX", List.of(productId))))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_CONTROLLED"));

    mockMvc
        .perform(
            post("/api/v1/compliance/controlled-stock/verify")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(customerId, doctorId, false, "RX", List.of(productId))))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INCOMPLETE_CONTROLLED"));

    Tenant other = persistTenant("ac05-b", "Other");
    persistPlan(other.getId(), PlanCode.FREE);
    persistUser(other.getId(), "owner@ac05-b.local", AppUserRole.pharmacy_owner);
    Location otherBranch = persistBranch(other.getId(), "Other", "OTH", true);
    Cookie otherCookie = login("owner@ac05-b.local");
    selectBranch(otherCookie, otherBranch.getId());

    mockMvc
        .perform(get("/api/v1/compliance/controlled-stock").cookie(otherCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isEmpty());

    Location second = persistBranch(fx.tenantId(), "Annex", "BR2", false);
    mockMvc
        .perform(
            get("/api/v1/compliance/controlled-stock")
                .cookie(fx.cookie())
                .param("branchId", second.getId().toString()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.message", containsString("found")));

    Cookie cashier = staffWithPredefined(fx, "cashier", "till@ac05.local");
    mockMvc
        .perform(get("/api/v1/compliance/controlled-stock").cookie(cashier))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Ctrl " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), branch.getId(), cookie);
  }

  private Fixture seedTwoBranches(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Ctrl " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    Location a = persistBranch(tenant.getId(), "Main", "BR01", true);
    Location b = persistBranch(tenant.getId(), "Annex", "BR02", false);
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, a.getId());
    return new Fixture(tenant.getId(), a.getId(), b.getId(), cookie);
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
                .content("{\"branchIds\":[\"" + fx.branchA() + "\"]}"))
        .andExpect(status().isOk());
    Cookie cookie = login(email);
    selectBranch(cookie, fx.branchA());
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

  private UUID createControlledProduct(Cookie cookie, String sku, String name, String schedule)
      throws Exception {
    UUID categoryId = createCategory(cookie, "Ctrl-" + sku);
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId, schedule)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(created.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID createCategory(Cookie cookie, String name) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID createCustomer(Cookie cookie, String name, String phone) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\"}"))
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
                        "{\"name\":\""
                            + name
                            + "\",\"registrationNumber\":\""
                            + registration
                            + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private void createWriteOffRule(Cookie cookie) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"INVENTORY",
                      "actionKey":"INVENTORY_WRITE_OFF",
                      "thresholdValue":1,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"pharmacy_owner",
                      "allowSelfApproval":true
                    }
                    """))
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
    tax.put("defaultGstRateBps", 1200);
    tax.put("taxState", "KA");
    branch.setTaxSettings(tax);
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
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

  private Tenant persistTenant(String slug, String name) {
    Tenant tenant = new Tenant();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(slug);
    tenant.setName(name);
    tenant.setStatus(TenantStatus.ACTIVE);
    tenant.setEmailVerifiedAt(T0);
    tenant.setCreatedAt(T0);
    tenant.setUpdatedAt(T0);
    return tenantRepository.saveAndFlush(tenant);
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
    user.setMustChangePassword(false);
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    user.setPasswordChangedAt(T0);
    return appUserRepository.saveAndFlush(user);
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

  private static String verifyJson(
      UUID customerId, UUID doctorId, boolean verified, String reference, List<UUID> productIds) {
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    String doctor = doctorId == null ? "null" : "\"" + doctorId + "\"";
    String ids =
        productIds.stream().map(id -> "\"" + id + "\"").reduce((a, b) -> a + "," + b).orElse("");
    return """
        {"customerId":%s,"doctorId":%s,"prescriptionVerified":%s,"prescriptionReference":"%s","productIds":[%s]}
        """
        .formatted(customer, doctor, verified, reference, ids);
  }

  private static String receiptJson(
      UUID productId,
      String batchNumber,
      String manufacturedOn,
      String expiresOn,
      long pricePaise,
      String quantity,
      String key,
      long expectedVersion) {
    return """
        {"productId":"%s","batchNumber":"%s","manufacturedOn":"%s","expiresOn":"%s","purchasePricePaise":%d,"quantity":%s,"idempotencyKey":"%s","expectedVersion":%d}
        """
        .formatted(
            productId,
            batchNumber,
            manufacturedOn,
            expiresOn,
            pricePaise,
            quantity,
            key,
            expectedVersion);
  }

  private static String transferJson(
      String direction, UUID counterparty, UUID productId, UUID batchId, String qty, String key) {
    return """
        {"direction":"%s","counterpartyBranchId":"%s","lines":[{"productId":"%s","batchId":"%s","quantity":%s}],"idempotencyKey":"%s"}
        """
        .formatted(direction, counterparty, productId, batchId, qty, key);
  }

  private static String productJson(String sku, String name, UUID categoryId, String schedule) {
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
          "prescriptionRequired":true,
          "scheduleClassification":"%s",
          "hsnCode":null,
          "gstRate":null,
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
          "controlledSubstance":true,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId, schedule);
  }

  private record Fixture(UUID tenantId, UUID branchA, UUID branchB, Cookie cookie) {}
}
