package com.nammamedmate.server.feature.compliance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.AuditEvent;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.Notification;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.AuditEventRepository;
import com.nammamedmate.server.persistence.ComplianceLicenseEvidenceRepository;
import com.nammamedmate.server.persistence.ComplianceLicenseRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.NotificationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

class LicenseTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-05T06:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private ComplianceLicenseRepository complianceLicenseRepository;
  @Autowired private ComplianceLicenseEvidenceRepository complianceLicenseEvidenceRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private AuditEventRepository auditEventRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void ac01_tracksDrugGstFssaiAndPharmacistRegistration() throws Exception {
    Fixture fx = seed("ac01");
    LocalDate far = LocalDate.now(ZoneOffset.UTC).plusDays(200);

    createLicense(
            fx.cookie(),
            "DRUG_LICENSE",
            "TENANT",
            null,
            null,
            "KA-DL-100",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.docType").value("DRUG_LICENSE"))
        .andExpect(jsonPath("$.data.scope").value("TENANT"))
        .andExpect(jsonPath("$.data.licenseNumber").value("KA-DL-100"))
        .andExpect(jsonPath("$.data.evidence").isArray())
        .andExpect(jsonPath("$.data.evidence.length()").value(1));

    createLicense(
            fx.cookie(),
            "GST",
            "BRANCH",
            fx.branchId(),
            null,
            "29ABCDE1234F1Z5",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.docType").value("GST"))
        .andExpect(jsonPath("$.data.scope").value("BRANCH"))
        .andExpect(jsonPath("$.data.branchId").value(fx.branchId().toString()));

    createLicense(
            fx.cookie(),
            "FSSAI",
            "TENANT",
            null,
            null,
            "11223344556677",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.docType").value("FSSAI"));

    createLicense(
            fx.cookie(),
            "PHARMACIST_REGISTRATION",
            "STAFF",
            null,
            fx.staffId(),
            "KA-RCI-88",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.docType").value("PHARMACIST_REGISTRATION"))
        .andExpect(jsonPath("$.data.scope").value("STAFF"))
        .andExpect(jsonPath("$.data.staffUserId").value(fx.staffId().toString()));

    mockMvc
        .perform(get("/api/v1/compliance/licenses").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(4));

    assertThat(complianceLicenseRepository.findAll())
        .allSatisfy(row -> assertThat(row.getTenantId()).isEqualTo(fx.tenantId()));
    assertThat(
            auditEventRepository.findAll().stream()
                .map(AuditEvent::getAction)
                .filter(action -> action.startsWith("LICENSE")))
        .contains("LICENSE_TRACK");
  }

  @Test
  void ac02_tenantBranchExpiryNotifiesOwnerAndMasterWithDistinctHrefs() throws Exception {
    Fixture fx = seed("ac02");
    LocalDate due = LocalDate.now(ZoneOffset.UTC).plusDays(10);

    createLicense(
            fx.cookie(),
            "DRUG_LICENSE",
            "TENANT",
            null,
            null,
            "KA-DL-DUE",
            due.minusYears(1).toString(),
            due.toString())
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/compliance/licenses/due").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items.length()").value(1))
        .andExpect(jsonPath("$.data.items[0].due").value(true));

    Cookie master = login("master@ac02.local");
    mockMvc
        .perform(get("/api/v1/admin/compliance/licenses/due").cookie(master))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].tenantId").value(fx.tenantId().toString()))
        .andExpect(jsonPath("$.data.items[0].tenantName").value("Chem ac02"))
        .andExpect(jsonPath("$.data.items[0].docType").value("DRUG_LICENSE"));

    List<Notification> notes = notificationRepository.findAll();
    Notification ownerNote =
        notes.stream()
            .filter(note -> note.getRecipientUserId().equals(fx.ownerId()))
            .findFirst()
            .orElseThrow();
    Notification masterNote =
        notes.stream()
            .filter(note -> note.getRecipientUserId().equals(fx.masterId()))
            .findFirst()
            .orElseThrow();
    assertThat(ownerNote.getHref()).isEqualTo("/licenses");
    assertThat(ownerNote.getSourceType()).isEqualTo("license_expiry");
    assertThat(ownerNote.getTenantId()).isEqualTo(fx.tenantId());
    assertThat(masterNote.getHref()).isEqualTo("/licence-expiry");
    assertThat(masterNote.getTenantId()).isNull();
  }

  @Test
  void ac03_staffExpiryNotifiesOwnerAndTheStaffMember() throws Exception {
    Fixture fx = seed("ac03");
    LocalDate due = LocalDate.now(ZoneOffset.UTC).plusDays(5);

    createLicense(
            fx.cookie(),
            "PHARMACIST_REGISTRATION",
            "STAFF",
            null,
            fx.staffId(),
            "KA-RCI-DUE",
            due.minusYears(2).toString(),
            due.toString())
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/v1/compliance/licenses/due").cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].docType").value("PHARMACIST_REGISTRATION"));

    List<UUID> recipients =
        notificationRepository.findAll().stream().map(Notification::getRecipientUserId).toList();
    assertThat(recipients).containsExactlyInAnyOrder(fx.ownerId(), fx.staffId());
    assertThat(
            notificationRepository.findAll().stream()
                .map(Notification::getSourceType)
                .distinct()
                .toList())
        .containsExactly("staff_license");
    assertThat(notificationRepository.findAll())
        .allSatisfy(note -> assertThat(note.getHref()).isEqualTo("/licenses"));
  }

  @Test
  void ac04_renewalRetainsPriorEvidenceAndDates() throws Exception {
    Fixture fx = seed("ac04");
    LocalDate issued = LocalDate.now(ZoneOffset.UTC).minusYears(1);
    LocalDate expires = LocalDate.now(ZoneOffset.UTC).plusDays(20);
    LocalDate nextIssued = LocalDate.now(ZoneOffset.UTC);
    LocalDate nextExpires = nextIssued.plusYears(5);

    MvcResult created =
        createLicense(
                fx.cookie(),
                "DRUG_LICENSE",
                "TENANT",
                null,
                null,
                "KA-DL-OLD",
                issued.toString(),
                expires.toString())
            .andExpect(status().isOk())
            .andReturn();
    JsonNode data = objectMapper.readTree(created.getResponse().getContentAsString()).path("data");
    String id = data.path("id").asText();
    int version = data.path("version").asInt();
    String firstEvidenceId = data.path("currentEvidenceId").asText();

    mockMvc
        .perform(
            renewBuilder(id)
                .param("licenseNumber", "KA-DL-NEW")
                .param("issuedOn", nextIssued.toString())
                .param("expiresOn", nextExpires.toString())
                .param("expectedVersion", String.valueOf(version))
                .cookie(fx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.licenseNumber").value("KA-DL-NEW"))
        .andExpect(jsonPath("$.data.issuedOn").value(nextIssued.toString()))
        .andExpect(jsonPath("$.data.expiresOn").value(nextExpires.toString()))
        .andExpect(jsonPath("$.data.evidence.length()").value(2))
        .andExpect(jsonPath("$.data.evidence[0].licenseNumber").value("KA-DL-OLD"))
        .andExpect(jsonPath("$.data.evidence[0].issuedOn").value(issued.toString()))
        .andExpect(jsonPath("$.data.evidence[0].expiresOn").value(expires.toString()))
        .andExpect(jsonPath("$.data.evidence[0].id").value(firstEvidenceId));

    assertThat(complianceLicenseEvidenceRepository.count()).isEqualTo(2);
    assertThat(auditEventRepository.findAll().stream().map(AuditEvent::getAction).toList())
        .contains("LICENSE_RENEW");

    mockMvc
        .perform(
            get("/api/v1/compliance/licenses/" + id + "/evidence/" + firstEvidenceId)
                .cookie(fx.cookie()))
        .andExpect(status().isOk());
  }

  @Test
  void ac05_invalidDatesMissingEvidenceUnauthorizedAndCrossTenantFailSafely() throws Exception {
    Fixture fx = seed("ac05");
    LocalDate far = LocalDate.now(ZoneOffset.UTC).plusDays(200);

    mockMvc.perform(get("/api/v1/compliance/licenses")).andExpect(status().isUnauthorized());

    Cookie staff = login("staff@ac05.local");
    createLicense(
            staff,
            "DRUG_LICENSE",
            "TENANT",
            null,
            null,
            "KA-DL-STAFF",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));

    mockMvc
        .perform(
            multipart("/api/v1/compliance/licenses")
                .param("docType", "DRUG_LICENSE")
                .param("scope", "TENANT")
                .param("licenseNumber", "KA-DL-NOFILE")
                .param("issuedOn", far.minusYears(1).toString())
                .param("expiresOn", far.toString())
                .cookie(fx.cookie()))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("MISSING_EVIDENCE"));
    assertThat(complianceLicenseRepository.count()).isZero();

    createLicense(
            fx.cookie(),
            "DRUG_LICENSE",
            "TENANT",
            null,
            null,
            "KA-DL-DATES",
            far.toString(),
            far.minusDays(1).toString())
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("LICENSE_DATE_INVALID"));
    assertThat(complianceLicenseRepository.count()).isZero();

    createLicense(
            fx.cookie(),
            "PHARMACIST_REGISTRATION",
            "STAFF",
            null,
            fx.staffId(),
            "  ",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_LICENSE"));

    createLicense(
            fx.cookie(),
            "DRUG_LICENSE",
            "TENANT",
            null,
            null,
            "KA-DL-ONE",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isOk());
    createLicense(
            fx.cookie(),
            "DRUG_LICENSE",
            "TENANT",
            null,
            null,
            "KA-DL-TWO",
            far.minusYears(1).toString(),
            far.toString())
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONFLICT"));

    Fixture other = seed("ac05-b");
    String foreignId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/v1/compliance/licenses").cookie(fx.cookie()))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .path("data")
            .path("items")
            .get(0)
            .path("id")
            .asText();
    mockMvc
        .perform(get("/api/v1/compliance/licenses").cookie(other.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isEmpty());
    mockMvc
        .perform(
            get("/api/v1/compliance/licenses/" + foreignId + "/evidence/" + UUID.randomUUID())
                .cookie(other.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));

    mockMvc
        .perform(
            renewBuilder(foreignId)
                .param("licenseNumber", "KA-DL-HACK")
                .param("issuedOn", far.minusYears(1).toString())
                .param("expiresOn", far.toString())
                .param("expectedVersion", "1")
                .cookie(other.cookie()))
        .andExpect(status().isNotFound());

    Cookie master = login("master@ac05.local");
    mockMvc
        .perform(get("/api/v1/admin/compliance/licenses/due").cookie(fx.cookie()))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/v1/compliance/licenses").cookie(master))
        .andExpect(status().isForbidden());

    String body =
        mockMvc
            .perform(get("/api/v1/compliance/licenses").cookie(fx.cookie()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode item = objectMapper.readTree(body).path("data").path("items").get(0);
    mockMvc
        .perform(
            renewBuilder(item.path("id").asText())
                .param("licenseNumber", "KA-DL-STALE")
                .param("issuedOn", far.minusYears(1).toString())
                .param("expiresOn", far.toString())
                .param("expectedVersion", "0")
                .cookie(fx.cookie()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_STATE"));
  }

  private org.springframework.test.web.servlet.ResultActions createLicense(
      Cookie cookie,
      String docType,
      String scope,
      UUID branchId,
      UUID staffUserId,
      String number,
      String issuedOn,
      String expiresOn)
      throws Exception {
    MockMultipartHttpServletRequestBuilder builder =
        multipart("/api/v1/compliance/licenses").file(pdf("evidence", "licence.pdf"));
    builder.param("docType", docType);
    builder.param("scope", scope);
    builder.param("licenseNumber", number);
    builder.param("issuedOn", issuedOn);
    builder.param("expiresOn", expiresOn);
    if (branchId != null) {
      builder.param("branchId", branchId.toString());
    }
    if (staffUserId != null) {
      builder.param("staffUserId", staffUserId.toString());
    }
    builder.cookie(cookie);
    return mockMvc.perform(builder);
  }

  private static MockMultipartHttpServletRequestBuilder renewBuilder(String id) {
    return multipart("/api/v1/compliance/licenses/" + id + "/renew")
        .file(pdf("evidence", "renewal.pdf"));
  }

  private static MockMultipartFile pdf(String name, String filename) {
    return new MockMultipartFile(
        name, filename, "application/pdf", "%PDF-1.4 licence".getBytes(StandardCharsets.UTF_8));
  }

  private Fixture seed(String tag) throws Exception {
    Tenant tenant = persistTenant(tag, "Chem " + tag);
    persistPlan(tenant.getId());
    AppUser owner =
        persistUser(tenant.getId(), "owner@" + tag + ".local", AppUserRole.pharmacy_owner);
    AppUser staff =
        persistUser(tenant.getId(), "staff@" + tag + ".local", AppUserRole.pharmacy_staff);
    AppUser master = persistUser(null, "master@" + tag + ".local", AppUserRole.admin_super);
    Location branch = persistBranch(tenant.getId(), "Main", "BR01");
    Cookie cookie = login("owner@" + tag + ".local");
    selectBranch(cookie, branch.getId());
    return new Fixture(
        tenant.getId(), owner.getId(), staff.getId(), master.getId(), branch.getId(), cookie);
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

  private void persistPlan(UUID tenantId) {
    TenantSubscription subscription = new TenantSubscription();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(tenantId);
    subscription.setPlanCode(PlanCode.FREE);
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

  private record Fixture(
      UUID tenantId, UUID ownerId, UUID staffId, UUID masterId, UUID branchId, Cookie cookie) {}
}
