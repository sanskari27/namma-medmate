package com.nammamedmate.server.feature.medicationsafety;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.ManufacturerRepository;
import com.nammamedmate.server.persistence.ProductCategoryRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class MedicationSafetyRollbackTest extends AbstractIntegrationTest {

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
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    auditEventRepository.deleteAll();
    productRepository.deleteAll();
    manufacturerRepository.deleteAll();
    productCategoryRepository.deleteAll();
    customerRepository.deleteAll();
    userSessionRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void failedAcknowledgeLeavesNoAuditRow() throws Exception {
    Tenant tenant = persistTenant("roll-safe", "Roll Safe");
    persistPlan(tenant.getId(), PlanCode.FREE);
    persistUser(tenant.getId(), "owner@roll-safe.local", AppUserRole.pharmacy_owner);
    Cookie cookie = login("owner@roll-safe.local");

    UUID customerId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/customers")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    "{\"name\":\"Ravi\",\"phone\":\"9876500199\",\"allergies\":\"Penicillin\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());

    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Antibiotics\"}"))
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
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                    """
                                    {
                                      "sku":"SKU-ROLL",
                                      "barcode":null,
                                      "name":"Penicillin V",
                                      "genericName":"Penicillin",
                                      "brandName":"PenV",
                                      "manufacturerId":null,
                                      "categoryId":"%s",
                                      "productType":"Medicine",
                                      "dosageForm":"Tablet",
                                      "therapeuticClass":null,
                                      "composition":"Penicillin",
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
                                        .formatted(categoryId)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());

    MvcResult evaluated =
        mockMvc
            .perform(
                post("/api/v1/medication-safety/evaluate")
                    .cookie(cookie)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"customerId\":\""
                            + customerId
                            + "\",\"productIds\":[\""
                            + productId
                            + "\"]}"))
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

    long before = auditEventRepository.count();
    mockMvc
        .perform(
            post("/api/v1/medication-safety/acknowledge")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"customerId\":\""
                        + customerId
                        + "\",\"productIds\":[\""
                        + productId
                        + "\"],\"warningKeys\":[\""
                        + warningKey
                        + "\"],\"reason\":\"\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    assertThat(auditEventRepository.count()).isEqualTo(before);
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
