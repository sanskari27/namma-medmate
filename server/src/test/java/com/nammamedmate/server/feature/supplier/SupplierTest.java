package com.nammamedmate.server.feature.supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.SupplierRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
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

class SupplierTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private SupplierRepository supplierRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_createAndUpdatePersistFullSupplierModel() throws Exception {
    Fixture fx = seed("fields");
    UUID categoryId = createCategory(fx.cookie(), "Tablets");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/suppliers")
                    .cookie(fx.cookie())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(fullJson("SUP-0001", categoryId, "29ABCDE1234F1Z5")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.supplierCode").value("SUP-0001"))
            .andExpect(jsonPath("$.data.legalName").value("Acme Pharma Pvt Ltd"))
            .andExpect(jsonPath("$.data.tradeName").value("Acme Distributors"))
            .andExpect(jsonPath("$.data.supplierType").value("DISTRIBUTOR"))
            .andExpect(jsonPath("$.data.gstin").value("29ABCDE1234F1Z5"))
            .andExpect(jsonPath("$.data.pan").value("ABCDE1234F"))
            .andExpect(jsonPath("$.data.drugLicenseNumber").value("KA-WH-2026-11"))
            .andExpect(jsonPath("$.data.drugLicenseType").value("WHOLESALE"))
            .andExpect(jsonPath("$.data.drugLicenseExpiry").value("2028-03-31"))
            .andExpect(jsonPath("$.data.fssaiLicenseNumber").value("11223344556677"))
            .andExpect(jsonPath("$.data.licenseStatus").value("VALID"))
            .andExpect(jsonPath("$.data.contactPersonName").value("Ramesh Rao"))
            .andExpect(jsonPath("$.data.contactPersonRole").value("Sales"))
            .andExpect(jsonPath("$.data.phone").value("9876500001"))
            .andExpect(jsonPath("$.data.alternatePhone").value("9876500002"))
            .andExpect(jsonPath("$.data.email").value("sales@acme.example"))
            .andExpect(jsonPath("$.data.website").value("https://acme.example"))
            .andExpect(jsonPath("$.data.addressLine1").value("12 MG Road"))
            .andExpect(jsonPath("$.data.city").value("Bengaluru"))
            .andExpect(jsonPath("$.data.state").value("KA"))
            .andExpect(jsonPath("$.data.pincode").value("560001"))
            .andExpect(jsonPath("$.data.country").value("India"))
            .andExpect(jsonPath("$.data.paymentTerms").value("CREDIT"))
            .andExpect(jsonPath("$.data.creditPeriodDays").value(30))
            .andExpect(jsonPath("$.data.creditLimitPaise").value(25000000))
            .andExpect(jsonPath("$.data.bankName").value("HDFC"))
            .andExpect(jsonPath("$.data.accountHolderName").value("Acme Pharma Pvt Ltd"))
            .andExpect(jsonPath("$.data.accountNumber").value("123456789012"))
            .andExpect(jsonPath("$.data.ifscCode").value("HDFC0001234"))
            .andExpect(jsonPath("$.data.upiId").value("acme@hdfcbank"))
            .andExpect(jsonPath("$.data.categoryIds", hasItem(categoryId.toString())))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.notes").value("Primary Bengaluru stockist"))
            .andExpect(jsonPath("$.data.rating").doesNotExist())
            .andReturn();
    UUID id =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(
            patch("/api/v1/suppliers/" + id)
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    fullJson("SUP-0001", categoryId, "29ABCDE1234F1Z5")
                        .replace(
                            "\"tradeName\":\"Acme Distributors\"", "\"tradeName\":\"Acme Hub\"")
                        .replace("\"status\":\"ACTIVE\"", "\"status\":\"INACTIVE\"")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.tradeName").value("Acme Hub"))
        .andExpect(jsonPath("$.data.status").value("INACTIVE"));

    mockMvc
        .perform(get("/api/v1/suppliers").param("q", "SUP-0001").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(id.toString()));

    List<AuditEvent> audits = auditEventRepository.findAll();
    assertThat(audits)
        .extracting(AuditEvent::getAction)
        .contains("SUPPLIER_CREATE", "SUPPLIER_UPDATE");
    assertThat(audits.stream().filter(event -> event.getAction().startsWith("SUPPLIER")))
        .isNotEmpty()
        .allSatisfy(
            event -> {
              assertThat(event.getContextJson()).contains("supplierId");
              assertThat(event.getContextJson()).doesNotContain("123456789012");
            });
    assertThat(supplierRepository.findByIdAndTenantId(id, fx.tenantId())).isPresent();
  }

  @Test
  void ac02_suppliersAreSharedAcrossTenantBranches() throws Exception {
    Fixture fx = seed("shared");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    UUID supplierId = createSupplier(fx.cookie(), "SUP-SHARE", "29ABCDE1234F1Z5");

    mockMvc
        .perform(get("/api/v1/suppliers").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(supplierId.toString()));

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/suppliers").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(supplierId.toString()));
    mockMvc
        .perform(get("/api/v1/suppliers/" + supplierId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(supplierId.toString()))
        .andExpect(jsonPath("$.data.legalName").value("Acme Pharma Pvt Ltd"));
  }

  @Test
  void ac03_poPlacementContextStaysBranchSpecific() throws Exception {
    Fixture fx = seed("branch-po");
    Location annex = persistBranch(fx.tenantId(), "Annex", "BR02", false);
    UUID supplierId = createSupplier(fx.cookie(), "SUP-PO", "29ABCDE1234F1Z5");

    mockMvc
        .perform(get("/api/v1/suppliers/" + supplierId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branchProcurement.branchId").value(fx.branchId().toString()))
        .andExpect(jsonPath("$.data.branchProcurement.branchName").value("Main"))
        .andExpect(jsonPath("$.data.branchProcurement.purchaseOrders", hasSize(0)));

    selectBranch(fx.cookie(), annex.getId());
    mockMvc
        .perform(get("/api/v1/suppliers/" + supplierId).cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.branchProcurement.branchId").value(annex.getId().toString()))
        .andExpect(jsonPath("$.data.branchProcurement.branchName").value("Annex"))
        .andExpect(jsonPath("$.data.branchProcurement.purchaseOrders", hasSize(0)));
  }

  @Test
  void ac04_noSupplierRatingIsIntroduced() throws Exception {
    Fixture fx = seed("norate");
    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(fx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalJson("SUP-NR", null).replace("}", ",\"rating\":4.5}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.rating").doesNotExist())
        .andExpect(jsonPath("$.data.performanceScore").doesNotExist());
    assertThat(supplierRepository.findAll())
        .allSatisfy(
            row ->
                assertThat(row.getClass().getDeclaredFields())
                    .extracting("name")
                    .doesNotContain("rating"));
  }

  @Test
  void ac05_deniedDuplicateLicenseBankAndCrossTenant() throws Exception {
    Tenant tenantA = persistTenant("iso-a", "Iso A");
    Tenant tenantB = persistTenant("iso-b", "Iso B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@iso.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@iso.local", AppUserRole.pharmacy_owner);
    AppUser salesOnly = persistUser(tenantA.getId(), "sales@iso.local", AppUserRole.pharmacy_staff);
    Cookie ownerA = login("owner-a@iso.local");
    Cookie ownerB = login("owner-b@iso.local");

    UUID salesRole = createRole(ownerA, "Sales only", "[\"SALES\"]");
    mockMvc.perform(putRoles(salesOnly.getId(), ownerA, salesRole)).andExpect(status().isOk());
    Cookie salesCookie = login("sales@iso.local");

    mockMvc
        .perform(get("/api/v1/suppliers").cookie(salesCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc.perform(get("/api/v1/suppliers")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    UUID firstId = createSupplier(ownerA, "SUP-DUP", "29ABCDE1234F1Z5");

    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalJson("SUP-DUP", "29AAAAA1234A1Z5")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CODE_TAKEN"));

    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalJson("SUP-GST", "29ABCDE1234F1Z5")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("GSTIN_TAKEN"));

    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalJson("SUP-LIC", null)
                        .replace(
                            "\"drugLicenseExpiry\":null", "\"drugLicenseExpiry\":\"2028-01-01\"")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("LICENSE_DATE_INVALID"));

    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalJson("SUP-OLD", null)
                        .replace("\"drugLicenseNumber\":null", "\"drugLicenseNumber\":\"KA-OLD\"")
                        .replace(
                            "\"drugLicenseExpiry\":null", "\"drugLicenseExpiry\":\"2020-01-01\"")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("LICENSE_DATE_INVALID"));

    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalJson("SUP-BANK", null)
                        .replace("\"accountNumber\":null", "\"accountNumber\":\"123456789012\"")
                        .replace(
                            "\"confirmAccountNumber\":null",
                            "\"confirmAccountNumber\":\"123456789012\"")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNSAFE_BANK_UPDATE"));

    mockMvc
        .perform(get("/api/v1/suppliers/" + firstId).cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/suppliers")
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalJson("SUP-DUP", "29ABCDE1234F1Z5")))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/suppliers").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[*].id", not(hasItem(firstId.toString()))));

    AppUser inventory = persistUser(tenantA.getId(), "stock@iso.local", AppUserRole.pharmacy_staff);
    UUID invRole = createRole(ownerA, "Stock desk", "[\"INVENTORY\",\"PROCUREMENT\"]");
    mockMvc.perform(putRoles(inventory.getId(), ownerA, invRole)).andExpect(status().isOk());
    Cookie invCookie = login("stock@iso.local");
    mockMvc.perform(get("/api/v1/suppliers").cookie(invCookie)).andExpect(status().isOk());

    AppUser accountant =
        persistUser(tenantA.getId(), "books@iso.local", AppUserRole.pharmacy_staff);
    UUID finRole = createRole(ownerA, "Books desk", "[\"FINANCE\"]");
    mockMvc.perform(putRoles(accountant.getId(), ownerA, finRole)).andExpect(status().isOk());
    Cookie finCookie = login("books@iso.local");
    mockMvc.perform(get("/api/v1/suppliers").cookie(finCookie)).andExpect(status().isOk());
  }

  private UUID createSupplier(Cookie cookie, String code, String gstin) throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/suppliers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(minimalJson(code, gstin)))
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
    String body =
        mockMvc
            .perform(
                post("/api/v1/product-categories")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"" + name + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder putRoles(
      UUID userId, Cookie owner, UUID roleId) {
    return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
            "/api/v1/users/" + userId + "/roles")
        .cookie(owner)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"roleIds\":[\"" + roleId + "\"]}");
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
    Tenant tenant = persistTenant(tag, "Supp " + tag);
    persistPlan(tenant.getId(), PlanCode.FREE);
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

  private static String minimalJson(String code, String gstin) {
    String gstinJson = gstin == null ? "null" : "\"" + gstin + "\"";
    return """
        {
          "supplierCode":"%s",
          "legalName":"Acme Pharma Pvt Ltd",
          "tradeName":null,
          "supplierType":"DISTRIBUTOR",
          "gstin":%s,
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
        .formatted(code, gstinJson);
  }

  private static String fullJson(String code, UUID categoryId, String gstin) {
    return """
        {
          "supplierCode":"%s",
          "legalName":"Acme Pharma Pvt Ltd",
          "tradeName":"Acme Distributors",
          "supplierType":"DISTRIBUTOR",
          "gstin":"%s",
          "pan":"ABCDE1234F",
          "drugLicenseNumber":"KA-WH-2026-11",
          "drugLicenseType":"WHOLESALE",
          "drugLicenseExpiry":"2028-03-31",
          "fssaiLicenseNumber":"11223344556677",
          "contactPersonName":"Ramesh Rao",
          "contactPersonRole":"Sales",
          "phone":"9876500001",
          "alternatePhone":"9876500002",
          "email":"sales@acme.example",
          "website":"https://acme.example",
          "addressLine1":"12 MG Road",
          "addressLine2":"Unit 4",
          "city":"Bengaluru",
          "state":"KA",
          "pincode":"560001",
          "country":"India",
          "paymentTerms":"CREDIT",
          "creditPeriodDays":30,
          "creditLimitPaise":25000000,
          "bankName":"HDFC",
          "accountHolderName":"Acme Pharma Pvt Ltd",
          "accountNumber":"123456789012",
          "confirmAccountNumber":"123456789012",
          "ifscCode":"HDFC0001234",
          "upiId":"acme@hdfcbank",
          "categoryIds":["%s"],
          "status":"ACTIVE",
          "notes":"Primary Bengaluru stockist"
        }
        """
        .formatted(code, gstin, categoryId);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie cookie) {}
}
