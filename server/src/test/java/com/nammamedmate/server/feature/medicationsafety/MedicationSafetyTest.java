package com.nammamedmate.server.feature.medicationsafety;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AccessRoleKind;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
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
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserAccessRoleRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class MedicationSafetyTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-04T02:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private ProductCategoryRepository productCategoryRepository;
  @Autowired private ManufacturerRepository manufacturerRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private UserAccessRoleRepository userAccessRoleRepository;
  @Autowired private AccessRoleEventRepository accessRoleEventRepository;
  @Autowired private AccessRoleModuleRepository accessRoleModuleRepository;
  @Autowired private AccessRoleRepository accessRoleRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    auditEventRepository.deleteAll();
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    customerRepository.deleteAll();
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
  void ac01_allergyWarningIdentifiesCustomerMedicineAndAllergen() throws Exception {
    Tenant tenant = persistTenant("allergy", "Allergy Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@allergy.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@allergy.local");

    UUID customerId = createCustomer(cookie, "Ravi", "9876500101", "Penicillin, Sulfa");
    UUID categoryId = createCategory(cookie, "Antibiotics");
    UUID productId =
        createProduct(
            cookie,
            "SKU-PEN",
            "Amoxicillin Capsule",
            "Amoxicillin",
            "Mox",
            "Amoxicillin trihydrate; penicillin class",
            categoryId);

    MvcResult evaluated =
        mockMvc
            .perform(
                post("/api/v1/medication-safety/evaluate")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(evaluateJson(customerId, List.of(productId))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.checkStatus").value("CHECKED"))
            .andExpect(jsonPath("$.data.warnings[0].kind").value("ALLERGY"))
            .andExpect(jsonPath("$.data.warnings[0].customerId").value(customerId.toString()))
            .andExpect(jsonPath("$.data.warnings[0].productId").value(productId.toString()))
            .andExpect(jsonPath("$.data.warnings[0].matchedAllergen").value("Penicillin"))
            .andExpect(jsonPath("$.data.warnings[0].severity").value("WARN"))
            .andExpect(jsonPath("$.data.warnings[0].requiredReview").value(true))
            .andExpect(jsonPath("$.data.safe").doesNotExist())
            .andReturn();

    String warningKey =
        objectMapper
            .readTree(evaluated.getResponse().getContentAsString())
            .path("data")
            .path("warnings")
            .get(0)
            .path("warningKey")
            .asText();

    mockMvc
        .perform(
            post("/api/v1/medication-safety/acknowledge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    acknowledgeJson(
                        customerId,
                        List.of(productId),
                        List.of(warningKey),
                        "Patient confirmed OK")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.acknowledged").value(true));

    List<AuditEvent> audits =
        auditEventRepository.findByTenantIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            tenant.getId(), Instant.EPOCH);
    assertThat(audits).isNotEmpty();
    assertThat(audits.get(0).getAction()).isEqualTo("MEDICATION_SAFETY_ACKNOWLEDGE");
    assertThat(audits.get(0).getContextJson()).contains("Penicillin");
    assertThat(audits.get(0).getContextJson()).contains("Patient confirmed OK");

    mockMvc
        .perform(
            post("/api/v1/medication-safety/assert-cleared")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    assertJson(
                        customerId,
                        List.of(productId),
                        List.of(warningKey),
                        "Patient confirmed OK")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.cleared").value(true));
  }

  @Test
  void ac02_duplicateCompositionWarningOnDraftLines() throws Exception {
    Tenant tenant = persistTenant("dupcomp", "Dup Comp Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@dupcomp.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@dupcomp.local");

    UUID customerId = createCustomer(cookie, "Meera", "9876500102", null);
    UUID categoryId = createCategory(cookie, "Analgesics");
    UUID productA =
        createProduct(
            cookie,
            "SKU-A",
            "Crocin 500",
            "Paracetamol",
            "Crocin",
            "Paracetamol 500mg",
            categoryId);
    UUID productB =
        createProduct(
            cookie, "SKU-B", "Dolo 650", "Paracetamol", "Dolo", "Paracetamol 500mg", categoryId);

    mockMvc
        .perform(
            post("/api/v1/medication-safety/evaluate")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(evaluateJson(customerId, List.of(productA, productB))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.checkStatus").value("CHECKED"))
        .andExpect(jsonPath("$.data.warnings[0].kind").value("DUPLICATE_COMPOSITION"))
        .andExpect(jsonPath("$.data.warnings[0].matchedComposition").value("Paracetamol 500mg"))
        .andExpect(jsonPath("$.data.warnings[0].productIds", hasItem(productA.toString())))
        .andExpect(jsonPath("$.data.warnings[0].productIds", hasItem(productB.toString())))
        .andExpect(jsonPath("$.data.warnings[0].requiredAction").value("REVIEW"))
        .andExpect(jsonPath("$.data.warnings[0].requiredReview").value(true));
  }

  @Test
  void ac03_incompleteCheckNeverPresentedAsSafe() throws Exception {
    Tenant tenant = persistTenant("incomplete", "Incomplete Chemist");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@incomplete.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@incomplete.local");

    UUID customerId = createCustomer(cookie, "Anita", "9876500103", "Ibuprofen");
    UUID categoryId = createCategory(cookie, "Misc");
    UUID blankProduct =
        createProduct(cookie, "SKU-BLANK", "Mystery Pack", null, null, null, categoryId);

    mockMvc
        .perform(
            post("/api/v1/medication-safety/evaluate")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(evaluateJson(customerId, List.of(blankProduct))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.checkStatus").value("INCOMPLETE"))
        .andExpect(jsonPath("$.data.safe").doesNotExist())
        .andExpect(jsonPath("$.data.checkLabel").value("Not checked"));

    mockMvc
        .perform(
            post("/api/v1/medication-safety/evaluate")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(evaluateJson(null, List.of())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.checkStatus").value("NOT_CHECKED"))
        .andExpect(jsonPath("$.data.checkLabel").value("Not checked"))
        .andExpect(jsonPath("$.data.safe").doesNotExist());
  }

  @Test
  void ac04_authorizationIsolationAndUnlinkedCompletion() throws Exception {
    Tenant tenantA = persistTenant("safe-a", "Safe A");
    Tenant tenantB = persistTenant("safe-b", "Safe B");
    persistPlan(tenantA.getId(), PlanCode.STARTER);
    persistPlan(tenantB.getId(), PlanCode.STARTER);
    persistUser(tenantA.getId(), "owner-a@safe.local", AppUserRole.pharmacy_owner);
    persistUser(tenantB.getId(), "owner-b@safe.local", AppUserRole.pharmacy_owner);
    AppUser crmOnly = persistUser(tenantA.getId(), "crm@safe.local", AppUserRole.pharmacy_staff);
    Cookie ownerA = login("owner-a@safe.local");
    Cookie ownerB = login("owner-b@safe.local");

    UUID crmRole = createRole(ownerA, "CRM only", "[\"CRM\"]");
    mockMvc.perform(putRoles(crmOnly.getId(), ownerA, crmRole)).andExpect(status().isOk());
    Cookie crmCookie = login("crm@safe.local");

    UUID customerA = createCustomer(ownerA, "Priya", "9876500104", "Penicillin");
    UUID categoryA = createCategory(ownerA, "Antibiotics");
    UUID productA =
        createProduct(
            ownerA,
            "SKU-A",
            "Penicillin V",
            "Phenoxymethylpenicillin",
            "PenV",
            "Penicillin",
            categoryA);

    UUID customerB = createCustomer(ownerB, "Other", "9876500105", "Penicillin");
    UUID categoryB = createCategory(ownerB, "Antibiotics");
    UUID productB =
        createProduct(
            ownerB, "SKU-B", "Penicillin B", "Penicillin", "PenB", "Penicillin", categoryB);

    mockMvc
        .perform(
            post("/api/v1/medication-safety/evaluate")
                .cookie(crmCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(evaluateJson(customerA, List.of(productA))))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(
            post("/api/v1/medication-safety/evaluate")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(evaluateJson(customerB, List.of(productA))))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            post("/api/v1/medication-safety/evaluate")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(evaluateJson(customerA, List.of(productB))))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    MvcResult evaluated =
        mockMvc
            .perform(
                post("/api/v1/medication-safety/evaluate")
                    .cookie(ownerA)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(evaluateJson(customerA, List.of(productA))))
            .andExpect(status().isOk())
            .andReturn();
    String warningKey =
        objectMapper
            .readTree(evaluated.getResponse().getContentAsString())
            .path("data")
            .path("warnings")
            .get(0)
            .path("warningKey")
            .asText();

    long auditsBefore = auditEventRepository.count();
    mockMvc
        .perform(
            post("/api/v1/medication-safety/acknowledge")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(acknowledgeJson(customerA, List.of(productA), List.of(warningKey), "  ")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    assertThat(auditEventRepository.count()).isEqualTo(auditsBefore);

    mockMvc
        .perform(
            post("/api/v1/medication-safety/acknowledge")
                .cookie(crmCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    acknowledgeJson(
                        customerA, List.of(productA), List.of(warningKey), "Should deny")))
        .andExpect(status().isForbidden());
    assertThat(auditEventRepository.count()).isEqualTo(auditsBefore);

    mockMvc
        .perform(
            post("/api/v1/medication-safety/assert-cleared")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(assertJson(null, List.of(productA), List.of(warningKey), "Reviewed")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("UNLINKED_CUSTOMER"));

    mockMvc
        .perform(
            post("/api/v1/medication-safety/assert-cleared")
                .cookie(ownerA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(assertJson(customerA, List.of(productA), List.of(warningKey), null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  private UUID createCustomer(Cookie cookie, String name, String phone, String allergies)
      throws Exception {
    String allergiesJson = allergies == null ? "null" : "\"" + allergies + "\"";
    String body =
        mockMvc
            .perform(
                post("/api/v1/customers")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\""
                            + name
                            + "\",\"phone\":\""
                            + phone
                            + "\",\"allergies\":"
                            + allergiesJson
                            + "}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
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

  private UUID createProduct(
      Cookie cookie,
      String sku,
      String name,
      String genericName,
      String brandName,
      String composition,
      UUID categoryId)
      throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        productJson(sku, name, genericName, brandName, composition, categoryId)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).path("data").path("id").asText());
  }

  private static String productJson(
      String sku,
      String name,
      String genericName,
      String brandName,
      String composition,
      UUID categoryId) {
    return """
        {
          "sku":"%s",
          "barcode":null,
          "name":"%s",
          "genericName":%s,
          "brandName":%s,
          "manufacturerId":null,
          "categoryId":"%s",
          "productType":"Medicine",
          "dosageForm":"Tablet",
          "therapeuticClass":null,
          "composition":%s,
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
        .formatted(
            sku,
            name,
            jsonStringOrNull(genericName),
            jsonStringOrNull(brandName),
            categoryId,
            jsonStringOrNull(composition));
  }

  private static String jsonStringOrNull(String value) {
    return value == null ? "null" : "\"" + value + "\"";
  }

  private static String evaluateJson(UUID customerId, List<UUID> productIds) {
    String products =
        productIds.stream().map(id -> "\"" + id + "\"").reduce((a, b) -> a + "," + b).orElse("");
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    return "{\"customerId\":" + customer + ",\"productIds\":[" + products + "]}";
  }

  private static String acknowledgeJson(
      UUID customerId, List<UUID> productIds, List<String> warningKeys, String reason) {
    String products =
        productIds.stream().map(id -> "\"" + id + "\"").reduce((a, b) -> a + "," + b).orElse("");
    String keys =
        warningKeys.stream().map(k -> "\"" + k + "\"").reduce((a, b) -> a + "," + b).orElse("");
    String reasonJson = reason == null ? "null" : "\"" + reason + "\"";
    return "{\"customerId\":\""
        + customerId
        + "\",\"productIds\":["
        + products
        + "],\"warningKeys\":["
        + keys
        + "],\"reason\":"
        + reasonJson
        + "}";
  }

  private static String assertJson(
      UUID customerId, List<UUID> productIds, List<String> warningKeys, String reason) {
    String products =
        productIds.stream().map(id -> "\"" + id + "\"").reduce((a, b) -> a + "," + b).orElse("");
    String keys =
        warningKeys.stream().map(k -> "\"" + k + "\"").reduce((a, b) -> a + "," + b).orElse("");
    String customer = customerId == null ? "null" : "\"" + customerId + "\"";
    String reasonJson = reason == null ? "null" : "\"" + reason + "\"";
    return "{\"customerId\":"
        + customer
        + ",\"productIds\":["
        + products
        + "],\"warningKeys\":["
        + keys
        + "],\"reason\":"
        + reasonJson
        + "}";
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
}
