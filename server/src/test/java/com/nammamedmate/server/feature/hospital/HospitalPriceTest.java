package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
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
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalProductPriceRuleRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserBranchRepository;
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

class HospitalPriceTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T09:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private UserBranchRepository userBranchRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private ProductCategoryRepository productCategoryRepository;
  @Autowired private ManufacturerRepository manufacturerRepository;
  @Autowired private HospitalCreditAccountRepository hospitalCreditAccountRepository;
  @Autowired private HospitalProductPriceRuleRepository hospitalProductPriceRuleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalProductPriceRuleRepository.deleteAll();
    hospitalCreditAccountRepository.deleteAll();
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    userBranchRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac03_uniformAndProductOverrideComputeCreditPrice() throws Exception {
    Fixture fx = seedPro("price-ac03");
    UUID productA = createProduct(fx.owner(), "SKU-A", "Paracetamol", 10_000L);
    UUID productB = createProduct(fx.owner(), "SKU-B", "Crocin", 20_000L);
    createAccount(fx.owner());

    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "uniformDiscountBps":500,
                      "productRules":[
                        {"productId":"%s","ruleType":"PERCENT","value":1000}
                      ]
                    }
                    """
                        .formatted(productB)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPLIED"))
        .andExpect(
            jsonPath("$.data.priceList.items[?(@.sku=='SKU-A')].creditPricePaise").value(9500))
        .andExpect(
            jsonPath("$.data.priceList.items[?(@.sku=='SKU-B')].creditPricePaise").value(18000));
  }

  @Test
  void ac04_ownerAppliesImmediatelyCashierDeniedAccountantNeedsApproval() throws Exception {
    Fixture fx = seedPro("price-ac04");
    UUID productId = createProduct(fx.owner(), "SKU-P", "Dolo", 10_000L);
    createAccount(fx.owner());
    Cookie cashier = staffWithPredefined(fx, "cashier", "till@price-ac04.local");
    Cookie accountant = staffWithPredefined(fx, "accountant", "books@price-ac04.local");

    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniformDiscountBps\":500}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniformDiscountBps\":1000}"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniformDiscountBps\":1000}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("APPROVAL_REQUIRED"));

    mockMvc
        .perform(
            post("/api/v1/approvals/rules")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "moduleCode":"HOSPITAL",
                      "actionKey":"HOSPITAL_PRICE_LIST",
                      "thresholdValue":0,
                      "approverType":"ACCOUNT_CLASS",
                      "approverAccountClass":"pharmacy_owner",
                      "allowSelfApproval":true
                    }
                    """))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(accountant)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "uniformDiscountBps":1500,
                      "productRules":[{"productId":"%s","ruleType":"FLAT_PAISE","value":500}]
                    }
                    """
                        .formatted(productId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PENDING_APPROVAL"));

    mockMvc
        .perform(get("/api/v1/hospital/prices").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.uniformDiscountBps").value(500));

    String requestId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/approvals/pending").cookie(fx.owner()))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("requests")
            .get(0)
            .path("id")
            .asText();

    mockMvc
        .perform(
            post("/api/v1/approvals/requests/" + requestId + "/decide")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"APPROVED\",\"note\":\"ok\",\"version\":1}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/hospital/prices").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.uniformDiscountBps").value(1500))
        .andExpect(jsonPath("$.data.items[0].creditPricePaise").value(9500));
  }

  @Test
  void ac04_priceListDoesNotRewriteProductMrp() throws Exception {
    Fixture fx = seedPro("price-mrp");
    UUID productId = createProduct(fx.owner(), "SKU-M", "Vitamin C", 12_000L);
    createAccount(fx.owner());

    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniformDiscountBps\":2000}"))
        .andExpect(status().isOk());

    Product product = productRepository.findById(productId).orElseThrow();
    assertThat(product.getDefaultMrpPaise()).isEqualTo(12_000L);
  }

  private void createAccount(Cookie owner) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "institutionName":"City Care",
                      "creditTerms":"NET_30",
                      "creditLimitPaise":1000000
                    }
                    """))
        .andExpect(status().isOk());
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
    JsonNode roles =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/roles").cookie(owner))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("roles");
    for (JsonNode role : roles) {
      if (code.equals(role.path("code").asText())) {
        return UUID.fromString(role.path("id").asText());
      }
    }
    throw new AssertionError("missing predefined role " + code);
  }

  private Fixture seedPro(String slug) throws Exception {
    Tenant tenant = persistTenant(slug, slug + " Chemist");
    persistPlan(tenant.getId(), PlanCode.PRO);
    persistUser(tenant.getId(), "owner@" + slug + ".local", AppUserRole.pharmacy_owner);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01");
    Cookie owner = login("owner@" + slug + ".local");
    selectBranch(owner, branch.getId());
    return new Fixture(tenant.getId(), branch.getId(), owner);
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

  private Location persistBranch(UUID tenantId, String name, String code) {
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
    branch.setDefaultBranch(true);
    branch.setLinkedWarehouse(false);
    branch.setCreatedAt(T0);
    branch.setUpdatedAt(T0);
    return locationRepository.saveAndFlush(branch);
  }

  private record Fixture(UUID tenantId, UUID branchId, Cookie owner) {}
}
