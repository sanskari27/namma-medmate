package com.nammamedmate.server.feature.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.PlanCode;
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
import com.nammamedmate.server.persistence.ProductUnitConversionRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
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
class ProductUnitTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("nammamedmate_product_unit")
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
  @Autowired private ProductUnitConversionRepository productUnitConversionRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    productUnitConversionRepository.deleteAll();
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
  void ac01_eachProductHasBaseUnitAndPackConversion() throws Exception {
    Cookie cookie = ownerCookie("uom-base", "owner@uom-base.local");
    UUID categoryId = createCategory(cookie, "Tablets");
    UUID productId = createProduct(cookie, "SKU-BASE", "Para 500", categoryId);

    mockMvc
        .perform(get("/api/v1/products/" + productId + "/units").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.baseUnit").value("Tablet"))
        .andExpect(jsonPath("$.data.quantityPrecision").value(0))
        .andExpect(jsonPath("$.data.units", hasSize(1)))
        .andExpect(jsonPath("$.data.units[0].unit").value("strip"))
        .andExpect(jsonPath("$.data.units[0].factorToBase").value(10))
        .andExpect(jsonPath("$.data.units[0].version").value(1));
  }

  @Test
  void ac02_conversionsArePositiveDeterministicAndVersioned() throws Exception {
    Cookie cookie = ownerCookie("uom-ver", "owner@uom-ver.local");
    UUID categoryId = createCategory(cookie, "Tablets");
    UUID productId = createProduct(cookie, "SKU-VER", "Crocin", categoryId);

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"strip","factorToBase":10},
                        {"unit":"box","factorToBase":100}
                      ]
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.units", hasSize(2)))
        .andExpect(jsonPath("$.data.units[?(@.unit=='strip')].version").value(1))
        .andExpect(jsonPath("$.data.units[?(@.unit=='box')].version").value(1));

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"strip","factorToBase":12},
                        {"unit":"box","factorToBase":100}
                      ]
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.units[?(@.unit=='strip')].factorToBase").value(12))
        .andExpect(jsonPath("$.data.units[?(@.unit=='strip')].version").value(2))
        .andExpect(jsonPath("$.data.units[?(@.unit=='box')].version").value(1));

    mockMvc
        .perform(
            post("/api/v1/products/" + productId + "/units/convert")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":2,\"fromUnit\":\"strip\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.baseQuantity").value(24))
        .andExpect(jsonPath("$.data.baseUnit").value("Tablet"))
        .andExpect(jsonPath("$.data.displayQuantity").value(2))
        .andExpect(jsonPath("$.data.displayUnit").value("strip"))
        .andExpect(jsonPath("$.data.conversionVersion").value(2))
        .andExpect(jsonPath("$.data.factorToBase").value(12));
  }

  @Test
  void ac03_convertNormalizesToBaseWithoutLosingDisplayUom() throws Exception {
    Cookie cookie = ownerCookie("uom-norm", "owner@uom-norm.local");
    UUID categoryId = createCategory(cookie, "Tablets");
    UUID productId = createProduct(cookie, "SKU-NORM", "Norm", categoryId);

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"strip","factorToBase":10},
                        {"unit":"box","factorToBase":100}
                      ]
                    }
                    """))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/products/" + productId + "/units/convert")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":1,\"fromUnit\":\"box\",\"toUnit\":\"strip\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.baseQuantity").value(100))
        .andExpect(jsonPath("$.data.baseUnit").value("Tablet"))
        .andExpect(jsonPath("$.data.quantity").value(10))
        .andExpect(jsonPath("$.data.unit").value("strip"))
        .andExpect(jsonPath("$.data.displayQuantity").value(1))
        .andExpect(jsonPath("$.data.displayUnit").value("box"));
  }

  @Test
  void ac04_fractionalQuantitiesFollowAllowedPrecision() throws Exception {
    Cookie cookie = ownerCookie("uom-prec", "owner@uom-prec.local");
    UUID categoryId = createCategory(cookie, "Syrups");
    UUID productId = createProduct(cookie, "SKU-PREC", "Syrup", categoryId);

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 2,
                      "units": [
                        {"unit":"bottle","factorToBase":100}
                      ]
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.quantityPrecision").value(2));

    mockMvc
        .perform(
            post("/api/v1/products/" + productId + "/units/convert")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":0.5,\"fromUnit\":\"bottle\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.baseQuantity").value(50));

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"bottle","factorToBase":100.5}
                      ]
                    }
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PRECISION_LOSS"));
  }

  @Test
  void ac05_rejectsInvalidConversionsAndIsolatesTenants() throws Exception {
    Tenant tenantA = persistTenant("uom-iso-a", "Iso A");
    Tenant tenantB = persistTenant("uom-iso-b", "Iso B");
    persistPlan(tenantA.getId(), PlanCode.FREE);
    persistPlan(tenantB.getId(), PlanCode.FREE);
    persistUser(tenantA.getId(), "owner-a@uom-iso.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@uom-iso.local", AppUserRole.pharmacy_owner);
    AppUser salesOnly =
        persistUser(tenantA.getId(), "sales@uom-iso.local", AppUserRole.pharmacy_staff);
    Cookie ownerA = login("owner-a@uom-iso.local");
    Cookie ownerB = login("owner-b@uom-iso.local");

    UUID salesRole = createRole(ownerA, "Sales only", "[\"SALES\"]");
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/users/" + salesOnly.getId() + "/roles")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleIds\":[\"" + salesRole + "\"]}"))
        .andExpect(status().isOk());
    Cookie salesCookie = login("sales@uom-iso.local");

    UUID categoryA = createCategory(ownerA, "General");
    UUID productId = createProduct(ownerA, "SKU-ISO", "Iso Prod", categoryA);

    mockMvc
        .perform(get("/api/v1/products/" + productId + "/units").cookie(salesCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.baseUnit").value("Tablet"));

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(salesCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"strip","factorToBase":10}
                      ]
                    }
                    """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"strip","factorToBase":0}
                      ]
                    }
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_CONVERSION"));

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"strip","factorToBase":10},
                        {"unit":"strip","factorToBase":12}
                      ]
                    }
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("DUPLICATE_UNIT"));

    mockMvc
        .perform(
            put("/api/v1/products/" + productId + "/units")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "quantityPrecision": 0,
                      "units": [
                        {"unit":"Tablet","factorToBase":1}
                      ]
                    }
                    """))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CIRCULAR_CONVERSION"));

    mockMvc
        .perform(get("/api/v1/products/" + productId + "/units").cookie(ownerB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/products/" + productId + "/units/convert")
                .cookie(ownerB)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":1,\"fromUnit\":\"strip\"}"))
        .andExpect(status().isNotFound());

    assertThat(productUnitConversionRepository.findAll()).isNotEmpty();
  }

  private Cookie ownerCookie(String slug, String email) {
    Tenant tenant = persistTenant(slug, slug);
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), email, AppUserRole.pharmacy_owner);
    try {
      return login(email);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private UUID createProduct(Cookie cookie, String sku, String name, UUID categoryId)
      throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(minimalProductJson(sku, name, categoryId)))
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
}
