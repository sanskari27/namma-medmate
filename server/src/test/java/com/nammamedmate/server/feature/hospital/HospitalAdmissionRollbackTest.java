package com.nammamedmate.server.feature.hospital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nammamedmate.server.AbstractIntegrationTest;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.HospitalBedOccupancy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
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

class HospitalAdmissionRollbackTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T12:30:00Z");

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
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalAdmissionRepository.deleteAll();
    hospitalBedRepository.deleteAll();
    hospitalWardRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void tpaValidationFailureLeavesBedFreeAndNoAdmission() throws Exception {
    Fixture fx = seedPro("adm-roll");
    WardBed wardBed = createWard(fx);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "patientName":"Ravi",
                      "uhid":"UHID-00001",
                      "wardId":"%s",
                      "bedId":"%s",
                      "payerType":"INSURANCE_TPA",
                      "insurerName":"",
                      "policyNumber":""
                    }
                    """
                        .formatted(wardBed.wardId(), wardBed.bedId(0))))
        .andExpect(status().isUnprocessableEntity());

    assertThat(hospitalAdmissionRepository.count()).isZero();
    assertThat(hospitalBedRepository.findById(wardBed.bedId(0)).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.FREE);
  }

  @Test
  void duplicateUhidAfterOccupyRollsBackBed() throws Exception {
    Fixture fx = seedPro("adm-roll2");
    WardBed wardBed = createWard(fx, 2);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(admitJson("First", "UHID-00001", wardBed.wardId(), wardBed.bedId(0))))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(admitJson("Second", "UHID-00001", wardBed.wardId(), wardBed.bedId(1))))
        .andExpect(status().isConflict());

    assertThat(hospitalAdmissionRepository.count()).isEqualTo(1);
    assertThat(hospitalBedRepository.findById(wardBed.bedId(1)).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.FREE);
  }

  private WardBed createWard(Fixture fx) throws Exception {
    return createWard(fx, 1);
  }

  private WardBed createWard(Fixture fx, int capacity) throws Exception {
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
                          "capacity":%d,
                          "nurseInCharge":null,
                          "expectedVersion":null
                        }
                        """
                            .formatted(capacity)))
            .andExpect(status().isOk())
            .andReturn();
    var data = objectMapper.readTree(ward.getResponse().getContentAsString()).path("data");
    UUID wardId = UUID.fromString(data.path("id").asText());
    UUID bed0 = UUID.fromString(data.path("beds").get(0).path("id").asText());
    UUID bed1 = capacity > 1 ? UUID.fromString(data.path("beds").get(1).path("id").asText()) : bed0;
    return new WardBed(wardId, bed0, bed1);
  }

  private String admitJson(String name, String uhid, UUID wardId, UUID bedId) {
    return """
        {
          "patientName":"%s",
          "uhid":"%s",
          "wardId":"%s",
          "bedId":"%s",
          "payerType":"SELF_PAY"
        }
        """
        .formatted(name, uhid, wardId, bedId);
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

  private record WardBed(UUID wardId, UUID bed0Id, UUID bed1Id) {
    UUID bedId(int index) {
      return index == 0 ? bed0Id : bed1Id;
    }
  }
}
