package com.nammamedmate.server.feature.product;

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
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AccessRoleEventRepository;
import com.nammamedmate.server.persistence.AccessRoleModuleRepository;
import com.nammamedmate.server.persistence.AccessRoleRepository;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class ProductTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_product")
          .withUsername("postgres")
          .withPassword("postgres");

  @DynamicPropertySource
  static void datasource(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private ProductCategoryRepository productCategoryRepository;
  @Autowired private ManufacturerRepository manufacturerRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    accessRoleEventRepository.deleteAll();
    userAccessRoleRepository.deleteAll();
    accessRoleRepository
        .findByKind(AccessRoleKind.CUSTOM)
        .forEach(
            role -> {
              accessRoleModuleRepository.deleteAll(
                  accessRoleModuleRepository.findByRoleIdIn(java.util.List.of(role.getId())));
              accessRoleRepository.delete(role);
            });
    userSessionRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_productsAreTenantScopedNoSharedCatalog() throws Exception {
    Tenant tenantA = persistTenant("prod-a", "Prod A");
    Tenant tenantB = persistTenant("prod-b", "Prod B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@prod.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@prod.local", AppUserRole.pharmacy_owner);
    Cookie ownerA = login("owner-a@prod.local");
    Cookie ownerB = login("owner-b@prod.local");

    UUID categoryA = createCategory(ownerA, "Analgesics");
    UUID categoryB = createCategory(ownerB, "Analgesics");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(ownerA)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(minimalProductJson("SKU-SHARED", "Paracetamol 500", categoryA)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sku").value("SKU-SHARED"))
            .andReturn();
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalProductJson("SKU-SHARED", "Paracetamol B", categoryB)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.sku").value("SKU-SHARED"));

    mockMvc
        .perform(get("/api/v1/products").cookie(ownerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[*].id", not(hasItem(productId.toString()))));

    mockMvc
        .perform(get("/api/v1/products/" + productId).cookie(ownerB))
        .andExpect(status().isNotFound());

    assertThat(productRepository.count()).isEqualTo(2);
  }

  @Test
  void ac02_createAndUpdatePersistFullProductModel() throws Exception {
    Tenant tenant = persistTenant("fields", "Fields Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@fields.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@fields.local");

    UUID categoryId = createCategory(cookie, "Tablets");
    UUID manufacturerId = createManufacturer(cookie, "Cipla");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(fullProductJson("SKU-FULL", categoryId, manufacturerId, false)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.sku").value("SKU-FULL"))
            .andExpect(jsonPath("$.data.barcode").value("8901030895124"))
            .andExpect(jsonPath("$.data.name").value("Crocin Advance"))
            .andExpect(jsonPath("$.data.genericName").value("Paracetamol"))
            .andExpect(jsonPath("$.data.brandName").value("Crocin"))
            .andExpect(jsonPath("$.data.manufacturerId").value(manufacturerId.toString()))
            .andExpect(jsonPath("$.data.categoryId").value(categoryId.toString()))
            .andExpect(jsonPath("$.data.productType").value("Medicine"))
            .andExpect(jsonPath("$.data.dosageForm").value("Tablet"))
            .andExpect(jsonPath("$.data.therapeuticClass").value("Analgesic"))
            .andExpect(jsonPath("$.data.composition").value("[{\"ingredient\":\"Paracetamol\"}]"))
            .andExpect(jsonPath("$.data.strength").value("500 mg"))
            .andExpect(jsonPath("$.data.route").value("Oral"))
            .andExpect(jsonPath("$.data.prescriptionRequired").value(false))
            .andExpect(jsonPath("$.data.scheduleClassification").value("OTC"))
            .andExpect(jsonPath("$.data.hsnCode").value("30049099"))
            .andExpect(jsonPath("$.data.gstRate").value(12))
            .andExpect(jsonPath("$.data.baseUnit").value("Tablet"))
            .andExpect(jsonPath("$.data.packSize").value(10))
            .andExpect(jsonPath("$.data.packUnit").value("strip"))
            .andExpect(jsonPath("$.data.packDescription").value("10 tablets/strip"))
            .andExpect(jsonPath("$.data.storageConditions").value("Store below 25C"))
            .andExpect(jsonPath("$.data.requiresColdStorage").value(false))
            .andExpect(jsonPath("$.data.rackLocation").value("A-12"))
            .andExpect(jsonPath("$.data.reorderLevel").value(20))
            .andExpect(jsonPath("$.data.reorderQuantity").value(100))
            .andExpect(jsonPath("$.data.minimumStock").value(10))
            .andExpect(jsonPath("$.data.isDiscontinued").value(false))
            .andExpect(jsonPath("$.data.isReturnable").value(true))
            .andExpect(jsonPath("$.data.isTaxable").value(true))
            .andExpect(jsonPath("$.data.taxCategory").value("GST-12"))
            .andExpect(jsonPath("$.data.requiresBatchTracking").value(true))
            .andExpect(jsonPath("$.data.requiresExpiryTracking").value(true))
            .andExpect(jsonPath("$.data.requiresSerialTracking").value(false))
            .andExpect(jsonPath("$.data.controlledSubstance").value(false))
            .andExpect(jsonPath("$.data.notes").value("Fast mover"))
            .andExpect(jsonPath("$.data.isActive").value(true))
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
            patch("/api/v1/products/" + id)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    fullProductJson("SKU-FULL", categoryId, manufacturerId, false)
                        .replace("\"Crocin Advance\"", "\"Crocin Advance 500\"")
                        .replace("\"rackLocation\":\"A-12\"", "\"rackLocation\":\"B-01\"")
                        .replace("\"reorderLevel\":20", "\"reorderLevel\":30")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.name").value("Crocin Advance 500"))
        .andExpect(jsonPath("$.data.rackLocation").value("B-01"))
        .andExpect(jsonPath("$.data.reorderLevel").value(30));

    Product stored = productRepository.findById(id).orElseThrow();
    assertThat(stored.getTenantId()).isEqualTo(tenant.getId());
    assertThat(stored.getName()).isEqualTo("Crocin Advance 500");
    assertThat(stored.getGstRate()).isEqualByComparingTo(new BigDecimal("12"));
    assertThat(stored.getReorderLevel()).isEqualTo(30);
  }

  @Test
  void ac03_barcodeStoredAsReferenceOnly() throws Exception {
    Tenant tenant = persistTenant("barcode", "Barcode Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@barcode.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@barcode.local");
    UUID categoryId = createCategory(cookie, "OTC");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        minimalProductJson("SKU-BC", "Barcode Item", categoryId)
                            .replace("\"barcode\":null", "\"barcode\":\"8901000000001\"")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.barcode").value("8901000000001"))
            .andReturn();

    UUID id =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(get("/api/v1/products/" + id).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.barcode").value("8901000000001"));

    mockMvc
        .perform(get("/api/v1/products").param("q", "8901000000001").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].barcode").value("8901000000001"));
  }

  @Test
  void ac04_discontinuedProductsRemainInHistory() throws Exception {
    Tenant tenant = persistTenant("disc", "Disc Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@disc.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@disc.local");
    UUID categoryId = createCategory(cookie, "Chronic");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(minimalProductJson("SKU-DISC", "Old Syrup", categoryId)))
            .andExpect(status().isOk())
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
            patch("/api/v1/products/" + id)
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalProductJson("SKU-DISC", "Old Syrup", categoryId)
                        .replace("\"isDiscontinued\":false", "\"isDiscontinued\":true")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.isDiscontinued").value(true));

    mockMvc
        .perform(get("/api/v1/products/" + id).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.isDiscontinued").value(true))
        .andExpect(jsonPath("$.data.name").value("Old Syrup"));

    mockMvc
        .perform(get("/api/v1/products").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)))
        .andExpect(jsonPath("$.data.items[0].id").value(id.toString()))
        .andExpect(jsonPath("$.data.items[0].isDiscontinued").value(true));

    assertThat(productRepository.findById(id)).isPresent();
  }

  @Test
  void ac05_deniedValidationConflictTrackingAndCrossTenant() throws Exception {
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
        .perform(get("/api/v1/products").cookie(salesCookie))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    UUID categoryA = createCategory(ownerA, "General");
    UUID categoryB = createCategory(ownerB, "General");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(ownerA)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(minimalProductJson("SKU-DUP", "First", categoryA)))
            .andExpect(status().isOk())
            .andReturn();
    UUID productId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalProductJson("SKU-DUP", "Second", categoryA)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("SKU_TAKEN"));

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalProductJson("SKU-HSN", "Bad HSN", categoryA)
                        .replace("\"hsnCode\":null", "\"hsnCode\":\"12AB\"")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalProductJson("SKU-GST", "Bad GST", categoryA)
                        .replace("\"gstRate\":null", "\"gstRate\":7")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalProductJson("SKU-EXP", "Expiry No Batch", categoryA)
                        .replace(
                            "\"requiresBatchTracking\":false", "\"requiresBatchTracking\":false")
                        .replace(
                            "\"requiresExpiryTracking\":false", "\"requiresExpiryTracking\":true")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    minimalProductJson("SKU-SER", "Serial Medicine", categoryA)
                        .replace(
                            "\"requiresSerialTracking\":false", "\"requiresSerialTracking\":true")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    mockMvc
        .perform(get("/api/v1/products/" + productId).cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/products")
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(minimalProductJson("SKU-B", "Tenant B", categoryB)))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/product-categories").cookie(ownerA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(1)));

    mockMvc
        .perform(get("/api/v1/manufacturers").cookie(ownerA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
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

  private UUID createManufacturer(Cookie cookie, String name) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/manufacturers")
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

  private static String minimalProductJson(String sku, String name, UUID categoryId) {
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
          "requiresBatchTracking":false,
          "requiresExpiryTracking":false,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "notes":null,
          "isActive":true
        }
        """
        .formatted(sku, name, categoryId);
  }

  private static String fullProductJson(
      String sku, UUID categoryId, UUID manufacturerId, boolean discontinued) {
    return """
        {
          "sku":"%s",
          "barcode":"8901030895124",
          "name":"Crocin Advance",
          "genericName":"Paracetamol",
          "brandName":"Crocin",
          "manufacturerId":"%s",
          "categoryId":"%s",
          "productType":"Medicine",
          "dosageForm":"Tablet",
          "therapeuticClass":"Analgesic",
          "composition":"[{\\"ingredient\\":\\"Paracetamol\\"}]",
          "strength":"500 mg",
          "route":"Oral",
          "prescriptionRequired":false,
          "scheduleClassification":"OTC",
          "hsnCode":"30049099",
          "gstRate":12,
          "baseUnit":"Tablet",
          "packSize":10,
          "packUnit":"strip",
          "packDescription":"10 tablets/strip",
          "storageConditions":"Store below 25C",
          "requiresColdStorage":false,
          "rackLocation":"A-12",
          "reorderLevel":20,
          "reorderQuantity":100,
          "minimumStock":10,
          "isDiscontinued":%s,
          "isReturnable":true,
          "isTaxable":true,
          "taxCategory":"GST-12",
          "requiresBatchTracking":true,
          "requiresExpiryTracking":true,
          "requiresSerialTracking":false,
          "controlledSubstance":false,
          "notes":"Fast mover",
          "isActive":true
        }
        """
        .formatted(sku, manufacturerId, categoryId, discontinued);
  }
}
