package com.nammamedmate.server.feature.hospital;

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
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalIndentLineRepository;
import com.nammamedmate.server.persistence.HospitalIndentRepository;
import com.nammamedmate.server.persistence.HospitalIndentSequenceRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalIndentTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T12:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private HospitalWardRepository hospitalWardRepository;
  @Autowired private HospitalBedRepository hospitalBedRepository;
  @Autowired private HospitalAdmissionRepository hospitalAdmissionRepository;
  @Autowired private HospitalIndentRepository hospitalIndentRepository;
  @Autowired private HospitalIndentLineRepository hospitalIndentLineRepository;
  @Autowired private HospitalIndentSequenceRepository hospitalIndentSequenceRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalIndentLineRepository.deleteAll();
    hospitalIndentRepository.deleteAll();
    hospitalIndentSequenceRepository.deleteAll();
    hospitalAdmissionRepository.deleteAll();
    hospitalBedRepository.deleteAll();
    hospitalWardRepository.deleteAll();
    productRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_createPersistsIndentWithLines() throws Exception {
    Fixture fx = seedPro("ind-basic");
    WardBed wardBed = createWard(fx, "General", "GEN", 2);
    UUID productId = createProduct(fx.owner(), "PARA-1", "Paracetamol 500", 2_000L);

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(
                        wardBed.wardId(),
                        wardBed.bedId(),
                        "Ravi Kumar",
                        null,
                        "Sister Meena",
                        productId,
                        "10")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.indentNumber").value("IND-00001"))
        .andExpect(jsonPath("$.data.wardName").value("General"))
        .andExpect(jsonPath("$.data.bedLabel").value("GEN-1"))
        .andExpect(jsonPath("$.data.patientName").value("Ravi Kumar"))
        .andExpect(jsonPath("$.data.requestedBy").value("Sister Meena"))
        .andExpect(jsonPath("$.data.status").value("PENDING"))
        .andExpect(jsonPath("$.data.lines", hasSize(1)))
        .andExpect(jsonPath("$.data.lines[0].issuedQty").value(0));

    assertThat(hospitalIndentRepository.count()).isEqualTo(1);
    assertThat(hospitalIndentLineRepository.count()).isEqualTo(1);
  }

  @Test
  void ac01_pharmacistAndInventoryCanCreate() throws Exception {
    Fixture fx = seedPro("ind-roles");
    WardBed wardBed = createWard(fx, "ICU", "ICU", 1);
    UUID productId = createProduct(fx.owner(), "DOL-1", "Dolo 650", 3_000L);
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "pharm@ind-roles.local");
    Cookie inventory = staffWithPredefined(fx, "inventory", "inv@ind-roles.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(
                        wardBed.wardId(),
                        null,
                        null,
                        "Floor stock refill",
                        "Dr Sharma",
                        productId,
                        "5")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.indentNumber").value("IND-00001"));

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(inventory)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(
                        wardBed.wardId(), null, null, "Night shift", "Sister Anu", productId, "2")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.indentNumber").value("IND-00002"));
  }

  @Test
  void ac01_missingLinesReturns422() throws Exception {
    Fixture fx = seedPro("ind-val");
    WardBed wardBed = createWard(fx, "General", "GEN", 1);

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "wardId":"%s",
                      "note":"Need saline",
                      "requestedBy":"Sister",
                      "lines":[]
                    }
                    """
                        .formatted(wardBed.wardId())))
        .andExpect(status().isBadRequest());
  }

  @Test
  void ac02_pendingApproveAndRejectAreIdempotent() throws Exception {
    Fixture fx = seedPro("ind-flow");
    WardBed wardBed = createWard(fx, "Surgical", "SUR", 1);
    UUID productId = createProduct(fx.owner(), "CEF-1", "Cefixime", 5_000L);
    UUID indentId = createIndent(fx, wardBed, productId);

    mockMvc
        .perform(post("/api/v1/hospital/indents/" + indentId + "/approve").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));

    mockMvc
        .perform(post("/api/v1/hospital/indents/" + indentId + "/approve").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));

    Fixture fxReject = seedPro("ind-reject");
    WardBed wardBed2 = createWard(fxReject, "Pediatric", "PED", 1);
    UUID productId2 = createProduct(fxReject.owner(), "SYR-1", "Syrup", 1_000L);
    UUID rejectedId = createIndent(fxReject, wardBed2, productId2);

    mockMvc
        .perform(
            post("/api/v1/hospital/indents/" + rejectedId + "/reject").cookie(fxReject.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("REJECTED"));

    mockMvc
        .perform(
            post("/api/v1/hospital/indents/" + rejectedId + "/reject").cookie(fxReject.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("REJECTED"));
  }

  @Test
  void ac03_approvedIndentShowsZeroIssuedQtyAndNoInvoice() throws Exception {
    Fixture fx = seedPro("ind-approved");
    WardBed wardBed = createWard(fx, "Private", "PRV", 1);
    UUID productId = createProduct(fx.owner(), "IV-1", "IV Fluid", 500L);
    UUID indentId = createIndent(fx, wardBed, productId);

    mockMvc
        .perform(post("/api/v1/hospital/indents/" + indentId + "/approve").cookie(fx.owner()))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/hospital/indents/" + indentId).cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"))
        .andExpect(jsonPath("$.data.lines[0].issuedQty").value(0))
        .andExpect(jsonPath("$.data.hospitalInvoiceRef").doesNotExist());
  }

  @Test
  void ac04_countsMatchBranchScope() throws Exception {
    Fixture fx = seedPro("ind-counts");
    WardBed wardBed = createWard(fx, "General", "GEN", 1);
    UUID productId = createProduct(fx.owner(), "TAB-1", "Tab A", 100L);
    UUID pendingId = createIndent(fx, wardBed, productId);
    UUID approvedId = createIndent(fx, wardBed, productId);
    mockMvc
        .perform(post("/api/v1/hospital/indents/" + approvedId + "/approve").cookie(fx.owner()))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/hospital/indents").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.pendingCount").value(1))
        .andExpect(jsonPath("$.data.approvedCount").value(1))
        .andExpect(jsonPath("$.data.issuedTodayCount").value(0))
        .andExpect(jsonPath("$.data.totalCount").value(2))
        .andExpect(jsonPath("$.data.items", hasSize(2)));

    Location annex = persistBranch(fx.tenantId(), "Annex", "AN01", false);
    Cookie ownerAnnex = login("owner@ind-counts.local");
    selectBranch(ownerAnnex, annex.getId());

    mockMvc
        .perform(get("/api/v1/hospital/indents").cookie(ownerAnnex))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalCount").value(0))
        .andExpect(jsonPath("$.data.items", hasSize(0)));

    assertThat(pendingId).isNotNull();
  }

  @Test
  void ac05_cashierForbiddenUnknownProductForeignWardStaleApprove() throws Exception {
    Fixture fx = seedPro("ind-guard");
    WardBed wardBed = createWard(fx, "General", "GEN", 1);
    UUID productId = createProduct(fx.owner(), "MED-1", "Medicine", 200L);
    Cookie cashier = staffWithPredefined(fx, "cashier", "cash@ind-guard.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(wardBed.wardId(), null, null, "Blocked", "Cashier", productId, "1")))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(
                        wardBed.wardId(),
                        null,
                        null,
                        "Bad product",
                        "Sister",
                        UUID.randomUUID(),
                        "1")))
        .andExpect(status().isNotFound());

    Fixture fxOther = seedPro("ind-other");
    WardBed foreignWard = createWard(fxOther, "Other", "OTH", 1);

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(
                        foreignWard.wardId(),
                        null,
                        null,
                        "Foreign ward",
                        "Sister",
                        productId,
                        "1")))
        .andExpect(status().isNotFound());

    UUID indentId = createIndent(fx, wardBed, productId);
    mockMvc
        .perform(post("/api/v1/hospital/indents/" + indentId + "/reject").cookie(fx.owner()))
        .andExpect(status().isOk());

    mockMvc
        .perform(post("/api/v1/hospital/indents/" + indentId + "/approve").cookie(fx.owner()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
  }

  @Test
  void ac01_sequentialIndentNumbersPerBranch() throws Exception {
    Fixture fx = seedPro("ind-seq");
    WardBed wardBed = createWard(fx, "General", "GEN", 1);
    UUID productId = createProduct(fx.owner(), "SEQ-1", "Seq Med", 100L);

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(wardBed.wardId(), null, null, "First", "Sister", productId, "1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.indentNumber").value("IND-00001"));

    mockMvc
        .perform(
            post("/api/v1/hospital/indents")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    indentJson(wardBed.wardId(), null, null, "Second", "Sister", productId, "2")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.indentNumber").value("IND-00002"));
  }

  private UUID createIndent(Fixture fx, WardBed wardBed, UUID productId) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/hospital/indents")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        indentJson(
                            wardBed.wardId(),
                            wardBed.bedId(),
                            "Patient",
                            null,
                            "Sister",
                            productId,
                            "3")))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private WardBed createWard(Fixture fx, String name, String code, int capacity) throws Exception {
    MvcResult ward =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(wardJson(name, code, capacity)))
            .andExpect(status().isOk())
            .andReturn();
    return new WardBed(wardId(ward), bedId(ward, 0));
  }

  private UUID createProduct(Cookie owner, String sku, String name, long mrpPaise)
      throws Exception {
    UUID categoryId = createCategory(owner, sku + " cat");
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(owner)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(productJson(sku, name, categoryId)))
            .andExpect(status().isOk())
            .andReturn();
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    Product product = productRepository.findById(productId).orElseThrow();
    product.setDefaultMrpPaise(mrpPaise);
    productRepository.saveAndFlush(product);
    return productId;
  }

  private UUID createCategory(Cookie owner, String name) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(owner)
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

  private String indentJson(
      UUID wardId,
      UUID bedId,
      String patientName,
      String note,
      String requestedBy,
      UUID productId,
      String quantity) {
    return """
        {
          "wardId":"%s",
          "bedId":%s,
          "patientName":%s,
          "note":%s,
          "requestedBy":"%s",
          "lines":[{"productId":"%s","quantity":%s}]
        }
        """
        .formatted(
            wardId,
            bedId == null ? "null" : "\"" + bedId + "\"",
            jsonString(patientName),
            jsonString(note),
            requestedBy,
            productId,
            quantity);
  }

  private static String jsonString(String value) {
    if (value == null) {
      return "null";
    }
    return "\"" + value + "\"";
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
          "controlledSubstance":false,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId);
  }

  private String wardJson(String name, String code, int capacity) {
    return """
        {
          "name":"%s",
          "code":"%s",
          "floor":null,
          "category":"GENERAL",
          "capacity":%d,
          "nurseInCharge":null,
          "expectedVersion":null
        }
        """
        .formatted(name, code, capacity);
  }

  private UUID wardId(MvcResult result) throws Exception {
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private UUID bedId(MvcResult result, int index) throws Exception {
    JsonNode beds =
        objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("beds");
    return UUID.fromString(beds.get(index).path("id").asText());
  }

  private Fixture seedPro(String slug) throws Exception {
    Tenant tenant = persistTenant(slug, slug + " Chemist");
    persistPlan(tenant.getId(), PlanCode.PRO);
    persistUser(tenant.getId(), "owner@" + slug + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01", true);
    Cookie owner = login("owner@" + slug + ".local");
    selectBranch(owner, branch.getId());
    return new Fixture(slug, tenant.getId(), branch.getId(), owner);
  }

  private Cookie staffWithPredefined(Fixture fx, String roleCode, String email) throws Exception {
    AppUser staff = persistUser(fx.tenantId(), email, AppUserRole.pharmacy_staff);
    UUID roleId = predefinedRoleId(fx.owner(), roleCode);
    mockMvc
        .perform(
            put("/api/v1/users/" + staff.getId() + "/roles")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + roleId + "\"]}"))
        .andExpect(status().isOk());
    assignBranch(fx.owner(), staff.getId(), fx.branchId());
    Cookie cookie = login(email);
    selectBranch(cookie, fx.branchId());
    return cookie;
  }

  private UUID predefinedRoleId(Cookie owner, String code) throws Exception {
    MvcResult result = mockMvc.perform(get("/api/v1/roles").cookie(owner)).andReturn();
    var roles =
        objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("roles");
    for (var role : roles) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
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
    return result.getResponse().getCookie("nmm_access");
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

  private void assignBranch(Cookie owner, UUID userId, UUID branchId) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/users/" + userId + "/branches")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branchId + "\"]}"))
        .andExpect(status().isOk());
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

  private void persistPlan(UUID tenantId, PlanCode plan) {
    TenantSubscription sub = new TenantSubscription();
    sub.setId(UUID.randomUUID());
    sub.setTenantId(tenantId);
    sub.setPlanCode(plan);
    sub.setStatus(SubscriptionStatus.ACTIVE);
    sub.setStartedAt(T0);
    sub.setCreatedAt(T0);
    sub.setUpdatedAt(T0);
    tenantSubscriptionRepository.saveAndFlush(sub);
  }

  private AppUser persistUser(UUID tenantId, String email, AppUserRole role) {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setTenantId(tenantId);
    user.setEmail(email);
    user.setDisplayName(email.split("@")[0]);
    user.setRole(role);
    user.setStatus(UserAccountStatus.ACTIVE);
    user.setActive(true);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setCreatedAt(T0);
    user.setUpdatedAt(T0);
    return appUserRepository.saveAndFlush(user);
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
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private record Fixture(String slug, UUID tenantId, UUID branchId, Cookie owner) {}

  private record WardBed(UUID wardId, UUID bedId) {}
}
