package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.HospitalIndentStatus;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.Product;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.pdf.HospitalWsInvoicePdfRenderer;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalIndentLineRepository;
import com.nammamedmate.server.persistence.HospitalIndentRepository;
import com.nammamedmate.server.persistence.HospitalIndentSequenceRepository;
import com.nammamedmate.server.persistence.HospitalIssueLineRepository;
import com.nammamedmate.server.persistence.HospitalIssueRepository;
import com.nammamedmate.server.persistence.HospitalLedgerEntryRepository;
import com.nammamedmate.server.persistence.HospitalProductPriceRuleRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.HospitalWardStockRepository;
import com.nammamedmate.server.persistence.HospitalWsInvoiceSequenceRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.ProductRepository;
import com.nammamedmate.server.persistence.StockBalanceRepository;
import com.nammamedmate.server.persistence.StockBatchRepository;
import com.nammamedmate.server.persistence.StockMovementRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalIssueRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T12:30:00Z");

  @MockBean private HospitalWsInvoicePdfRenderer hospitalWsInvoicePdfRenderer;

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
  @Autowired private HospitalIssueRepository hospitalIssueRepository;
  @Autowired private HospitalIssueLineRepository hospitalIssueLineRepository;
  @Autowired private HospitalWsInvoiceSequenceRepository hospitalWsInvoiceSequenceRepository;
  @Autowired private HospitalWardStockRepository hospitalWardStockRepository;
  @Autowired private HospitalLedgerEntryRepository hospitalLedgerEntryRepository;
  @Autowired private HospitalCreditAccountRepository hospitalCreditAccountRepository;
  @Autowired private HospitalProductPriceRuleRepository hospitalProductPriceRuleRepository;
  @Autowired private ProductRepository productRepository;
  @Autowired private StockBatchRepository stockBatchRepository;
  @Autowired private StockBalanceRepository stockBalanceRepository;
  @Autowired private StockMovementRepository stockMovementRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalIssueLineRepository.deleteAll();
    hospitalLedgerEntryRepository.deleteAll();
    hospitalIssueRepository.deleteAll();
    hospitalWsInvoiceSequenceRepository.deleteAll();
    hospitalWardStockRepository.deleteAll();
    hospitalIndentLineRepository.deleteAll();
    hospitalIndentRepository.deleteAll();
    hospitalIndentSequenceRepository.deleteAll();
    hospitalAdmissionRepository.deleteAll();
    hospitalBedRepository.deleteAll();
    hospitalWardRepository.deleteAll();
    hospitalProductPriceRuleRepository.deleteAll();
    hospitalCreditAccountRepository.deleteAll();
    stockMovementRepository.deleteAll();
    stockBalanceRepository.deleteAll();
    stockBatchRepository.deleteAll();
    productRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void adapterFailureLeavesIndentStockAndArUnchanged() throws Exception {
    doThrow(new IllegalStateException("pdf exploded"))
        .when(hospitalWsInvoicePdfRenderer)
        .render(any());
    Fixture fx = seedPro("iss-roll");
    configure(fx);
    WardBed wardBed = createWard(fx);
    Stocked stocked = stocked(fx);
    UUID indentId = createApprovedIndent(fx, wardBed, stocked.productId());
    BigDecimal qtyBefore =
        stockBalanceRepository
            .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                fx.tenantId(), fx.branchId(), stocked.productId(), stocked.batchId())
            .orElseThrow()
            .getQuantity();

    mockMvc
        .perform(
            post("/api/v1/hospital/issues")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "wardId":"%s",
                      "indentId":"%s",
                      "reason":"FLOOR_STOCK",
                      "idempotencyKey":"iss-roll-1",
                      "lines":[{"productId":"%s","batchId":"%s","quantity":3}]
                    }
                    """
                        .formatted(
                            wardBed.wardId(), indentId, stocked.productId(), stocked.batchId())))
        .andExpect(status().is5xxServerError());

    assertThat(hospitalIssueRepository.count()).isZero();
    assertThat(hospitalLedgerEntryRepository.count()).isZero();
    assertThat(hospitalWardStockRepository.count()).isZero();
    assertThat(hospitalIndentRepository.findById(indentId).orElseThrow().getStatus())
        .isEqualTo(HospitalIndentStatus.APPROVED);
    assertThat(hospitalCreditAccountRepository.findAll().get(0).getBalancePaise()).isZero();
    assertThat(
            stockBalanceRepository
                .findByTenantIdAndBranchIdAndProductIdAndBatchId(
                    fx.tenantId(), fx.branchId(), stocked.productId(), stocked.batchId())
                .orElseThrow()
                .getQuantity())
        .isEqualByComparingTo(qtyBefore);
  }

  private void configure(Fixture fx) throws Exception {
    mockMvc
        .perform(
            put("/api/v1/hospital/account")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "institutionName":"City Care",
                      "gstin":"29ABCDE1234F1Z5",
                      "creditTerms":"NET_30",
                      "creditLimitPaise":2000000
                    }
                    """))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            put("/api/v1/hospital/prices")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"uniformDiscountBps\":1000}"))
        .andExpect(status().isOk());
  }

  private UUID createApprovedIndent(Fixture fx, WardBed wardBed, UUID productId) throws Exception {
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/hospital/indents")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "wardId":"%s",
                          "bedId":"%s",
                          "patientName":"Patient",
                          "requestedBy":"Sister",
                          "lines":[{"productId":"%s","quantity":3}]
                        }
                        """
                            .formatted(wardBed.wardId(), wardBed.bedId(), productId)))
            .andExpect(status().isOk())
            .andReturn();
    UUID indentId =
        UUID.fromString(
            objectMapper
                .readTree(created.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    mockMvc
        .perform(post("/api/v1/hospital/indents/" + indentId + "/approve").cookie(fx.owner()))
        .andExpect(status().isOk());
    return indentId;
  }

  private Stocked stocked(Fixture fx) throws Exception {
    UUID categoryId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            post("/api/v1/product-categories")
                                .cookie(fx.owner())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"roll cat\"}"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("id")
                .asText());
    MvcResult created =
        mockMvc
            .perform(
                post("/api/v1/products")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "sku":"ROLL-1",
                          "name":"Roll Med",
                          "categoryId":"%s",
                          "productType":"Medicine",
                          "dosageForm":"Tablet",
                          "baseUnit":"Tablet",
                          "packSize":10,
                          "packUnit":"strip",
                          "requiresColdStorage":false,
                          "isDiscontinued":false,
                          "isReturnable":true,
                          "isTaxable":true,
                          "requiresBatchTracking":true,
                          "requiresExpiryTracking":true,
                          "requiresSerialTracking":false,
                          "controlledSubstance":false,
                          "prescriptionRequired":false,
                          "isActive":true
                        }
                        """
                            .formatted(categoryId)))
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
    product.setDefaultMrpPaise(10_000L);
    productRepository.saveAndFlush(product);
    mockMvc
        .perform(
            post("/api/v1/inventory/receipts")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"productId":"%s","batchNumber":"LOT-R","manufacturedOn":"2026-01-01","expiresOn":"2027-01-01","purchasePricePaise":1000,"quantity":10,"idempotencyKey":"roll-recv","expectedVersion":0}
                    """
                        .formatted(productId)))
        .andExpect(status().isOk());
    UUID batchId =
        UUID.fromString(
            objectMapper
                .readTree(
                    mockMvc
                        .perform(
                            get("/api/v1/inventory/products/" + productId + "/batches")
                                .cookie(fx.owner()))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data")
                .path("items")
                .get(0)
                .path("batchId")
                .asText());
    return new Stocked(productId, batchId);
  }

  private WardBed createWard(Fixture fx) throws Exception {
    MvcResult ward =
        mockMvc
            .perform(
                post("/api/v1/hospital/wards")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name":"General",
                          "code":"GEN",
                          "floor":null,
                          "category":"GENERAL",
                          "capacity":1,
                          "nurseInCharge":null,
                          "expectedVersion":null
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode data = objectMapper.readTree(ward.getResponse().getContentAsString()).path("data");
    return new WardBed(
        UUID.fromString(data.path("id").asText()),
        UUID.fromString(data.path("beds").get(0).path("id").asText()));
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
    branch.setGstin("29AAAAA0000A1Z5");
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

  private record WardBed(UUID wardId, UUID bedId) {}

  private record Stocked(UUID productId, UUID batchId) {}
}
