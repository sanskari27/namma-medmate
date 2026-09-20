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
import com.nammamedmate.server.application.hospital.HospitalAdmissionCommand;
import com.nammamedmate.server.application.hospital.HospitalAdmissionService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.BranchStatus;
import com.nammamedmate.server.domain.BranchType;
import com.nammamedmate.server.domain.Customer;
import com.nammamedmate.server.domain.HospitalBedOccupancy;
import com.nammamedmate.server.domain.Location;
import com.nammamedmate.server.domain.PlanCode;
import com.nammamedmate.server.domain.SubscriptionStatus;
import com.nammamedmate.server.domain.Tenant;
import com.nammamedmate.server.domain.TenantStatus;
import com.nammamedmate.server.domain.TenantSubscription;
import com.nammamedmate.server.domain.UserAccountStatus;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerRepository;
import com.nammamedmate.server.persistence.HospitalAdmissionRepository;
import com.nammamedmate.server.persistence.HospitalBedRepository;
import com.nammamedmate.server.persistence.HospitalDepartmentRepository;
import com.nammamedmate.server.persistence.HospitalDoctorRepository;
import com.nammamedmate.server.persistence.HospitalWardRepository;
import com.nammamedmate.server.persistence.LocationRepository;
import com.nammamedmate.server.persistence.TenantRepository;
import com.nammamedmate.server.persistence.TenantSubscriptionRepository;
import com.nammamedmate.server.persistence.UserSessionRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

class HospitalAdmissionTest extends AbstractIntegrationTest {

  private static final String PASSWORD = "counter-pass-1";
  private static final Instant T0 = Instant.parse("2026-09-20T12:00:00Z");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private HospitalAdmissionService hospitalAdmissionService;
  @Autowired private TenantRepository tenantRepository;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private UserSessionRepository userSessionRepository;
  @Autowired private TenantSubscriptionRepository tenantSubscriptionRepository;
  @Autowired private LocationRepository locationRepository;
  @Autowired private HospitalWardRepository hospitalWardRepository;
  @Autowired private HospitalBedRepository hospitalBedRepository;
  @Autowired private HospitalAdmissionRepository hospitalAdmissionRepository;
  @Autowired private HospitalDepartmentRepository hospitalDepartmentRepository;
  @Autowired private HospitalDoctorRepository hospitalDoctorRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @BeforeEach
  void wipe() {
    hospitalAdmissionRepository.deleteAll();
    hospitalDoctorRepository.deleteAll();
    hospitalDepartmentRepository.deleteAll();
    hospitalBedRepository.deleteAll();
    hospitalWardRepository.deleteAll();
    customerRepository.deleteAll();
    userSessionRepository.deleteAll();
    locationRepository.deleteAll();
    tenantSubscriptionRepository.deleteAll();
    appUserRepository.deleteAll();
    tenantRepository.deleteAll();
  }

  @Test
  void ac01_admitPersistsRequiredFieldsAndOccupiesBed() throws Exception {
    Fixture fx = seedPro("adm-basic");
    WardBed wardBed = createWard(fx, "General", "GEN", 2);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Ravi Kumar",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.patientName").value("Ravi Kumar"))
        .andExpect(jsonPath("$.data.uhid").value("UHID-00001"))
        .andExpect(jsonPath("$.data.wardName").value("General"))
        .andExpect(jsonPath("$.data.bedLabel").value("GEN-1"))
        .andExpect(jsonPath("$.data.status").value("ACTIVE"))
        .andExpect(jsonPath("$.data.payerType").value("SELF_PAY"))
        .andExpect(jsonPath("$.data.insurerName").doesNotExist())
        .andExpect(jsonPath("$.data.admittedAt").isNotEmpty());

    assertThat(
            hospitalBedRepository.findById(wardBed.freeBedId()).orElseThrow().getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.OCCUPIED);
    assertThat(hospitalAdmissionRepository.count()).isEqualTo(1);
  }

  @Test
  void ac01_missingRequiredFieldsReturn400() throws Exception {
    Fixture fx = seedPro("adm-val");
    WardBed wardBed = createWard(fx, "General", "GEN", 1);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void ac01_occupiedBedReturnsBedOccupied() throws Exception {
    Fixture fx = seedPro("adm-occ");
    WardBed wardBed = createWard(fx, "ICU", "ICU", 1);
    admitPatient(fx, "First", "UHID-00001", wardBed);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Second",
                        "UHID-00002",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("BED_OCCUPIED"));

    assertThat(hospitalAdmissionRepository.count()).isEqualTo(1);
  }

  @Test
  void ac02_nextUhidPrefillsAndDuplicateUhidConflicts() throws Exception {
    Fixture fx = seedPro("adm-uhid");
    WardBed wardBed = createWard(fx, "General", "GEN", 2);

    mockMvc
        .perform(get("/api/v1/hospital/admissions/next-uhid").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.nextUhid").value("UHID-00001"));

    admitPatient(fx, "Ravi", "UHID-00001", wardBed);

    mockMvc
        .perform(get("/api/v1/hospital/admissions/next-uhid").cookie(fx.owner()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.nextUhid").value("UHID-00002"));

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Duplicate",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("UHID_TAKEN"));
  }

  @Test
  void ac02_otherTenantUhidLookupIs404() throws Exception {
    Fixture fxA = seedPro("adm-iso-a");
    Fixture fxB = seedPro("adm-iso-b");
    WardBed wardBed = createWard(fxA, "General", "GA", 1);
    admitPatient(fxA, "Ravi", "UHID-00001", wardBed);

    mockMvc
        .perform(get("/api/v1/hospital/admissions?uhid=UHID-00001").cookie(fxB.owner()))
        .andExpect(status().isNotFound());
  }

  @Test
  void ac03_selfPayStoresNoPolicyAndTpaSnapshots() throws Exception {
    Fixture fx = seedPro("adm-payer");
    WardBed wardBed = createWard(fx, "Private", "PRV", 2);

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Self pay",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        "Should drop",
                        "POL-1")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.insurerName").doesNotExist())
        .andExpect(jsonPath("$.data.policyNumber").doesNotExist());

    UUID secondBed = bedId(wardBed.wardResult(), 1);
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "TPA patient",
                        "UHID-00002",
                        wardBed.wardId(),
                        secondBed,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "INSURANCE_TPA",
                        "Star Health",
                        "POL-9988")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.insurerName").value("Star Health"))
        .andExpect(jsonPath("$.data.policyNumber").value("POL-9988"));

    WardBed spareBed = createWard(fx, "Casualty", "CAS", 1);
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Incomplete TPA",
                        "UHID-00003",
                        spareBed.wardId(),
                        spareBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "INSURANCE_TPA",
                        "",
                        "")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("TPA_INCOMPLETE"));
  }

  @Test
  void ac04_phoneMayLinkCustomerWithoutCreatingLogin() throws Exception {
    Fixture fx = seedPro("adm-crm");
    WardBed wardBed = createWard(fx, "General", "GEN", 1);
    Customer customer = persistCustomer(fx.tenantId(), "Smoke Customer", "9876500001");
    long sessionsBefore = userSessionRepository.count();

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Walk-in casualty",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        "9876500001",
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.customerId").value(customer.getId().toString()));

    assertThat(userSessionRepository.count()).isEqualTo(sessionsBefore);

    WardBed wardBed2 = createWard(fx, "Casualty", "CAS", 1);
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "No CRM",
                        "UHID-00002",
                        wardBed2.wardId(),
                        wardBed2.freeBedId(),
                        "9000000000",
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.customerId").doesNotExist());
  }

  @Test
  void ac05_cashierForbiddenForeignDoctor404ConcurrentOccupy() throws Exception {
    Fixture fx = seedPro("adm-guard");
    WardBed wardBed = createWard(fx, "Surgical", "SUR", 1);
    Cookie cashier = staffWithPredefined(fx, "cashier", "cash@adm-guard.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Blocked",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isForbidden());

    Fixture fxOther = seedPro("adm-other");
    UUID foreignDoctor = createDoctor(fxOther, "Dr Foreign");

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Ravi",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        foreignDoctor,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isNotFound());

    WardBed concurrentBed = createWard(fx, "Private", "PRV", 1);
    AuthPrincipal principal = authPrincipal(fx);
    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    AtomicInteger successes = new AtomicInteger();
    AtomicInteger failures = new AtomicInteger();
    try {
      for (int i = 0; i < 2; i++) {
        pool.submit(
            () -> {
              try {
                start.await();
                hospitalAdmissionService.admit(
                    principal,
                    new HospitalAdmissionCommand(
                        "Patient",
                        "UHID-00010",
                        concurrentBed.wardId(),
                        concurrentBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null));
                successes.incrementAndGet();
              } catch (ApiException ex) {
                if ("BED_OCCUPIED".equals(ex.getCode()) || "UHID_TAKEN".equals(ex.getCode())) {
                  failures.incrementAndGet();
                } else {
                  throw ex;
                }
              } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
              }
            });
      }
      start.countDown();
      pool.shutdown();
      while (!pool.isTerminated()) {
        Thread.sleep(20);
      }
    } finally {
      pool.shutdownNow();
    }
    assertThat(successes.get()).isEqualTo(1);
    assertThat(failures.get()).isEqualTo(1);
    assertThat(hospitalAdmissionRepository.count()).isEqualTo(1);
    assertThat(
            hospitalBedRepository
                .findById(concurrentBed.freeBedId())
                .orElseThrow()
                .getOccupancyStatus())
        .isEqualTo(HospitalBedOccupancy.OCCUPIED);
  }

  @Test
  void ac05_otherBranchAdmissionIs404() throws Exception {
    Fixture fx = seedPro("adm-branch");
    Location annex = persistBranch(fx.tenantId(), "Annex", "AN01", false);
    WardBed wardBed = createWard(fx, "General", "GEN", 1);
    admitPatient(fx, "Ravi", "UHID-00001", wardBed);

    Cookie ownerNoBranchSwitch = login("owner@adm-branch.local");
    selectBranch(ownerNoBranchSwitch, annex.getId());

    mockMvc
        .perform(get("/api/v1/hospital/admissions").cookie(ownerNoBranchSwitch))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items", hasSize(0)));
  }

  @Test
  void ac01_pharmacistCanAdmit() throws Exception {
    Fixture fx = seedPro("adm-pharm");
    WardBed wardBed = createWard(fx, "Pediatric", "PED", 1);
    Cookie pharmacist = staffWithPredefined(fx, "pharmacist", "pharm@adm-pharm.local");

    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(pharmacist)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        "Child",
                        "UHID-00001",
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.patientName").value("Child"));
  }

  private void admitPatient(Fixture fx, String name, String uhid, WardBed wardBed)
      throws Exception {
    mockMvc
        .perform(
            post("/api/v1/hospital/admissions")
                .cookie(fx.owner())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    admitJson(
                        name,
                        uhid,
                        wardBed.wardId(),
                        wardBed.freeBedId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        "SELF_PAY",
                        null,
                        null)))
        .andExpect(status().isOk());
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
    return new WardBed(wardId(ward), bedId(ward, 0), ward);
  }

  private UUID createDoctor(Fixture fx, String name) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/hospital/doctors")
                    .cookie(fx.owner())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name":"%s",
                          "status":"AVAILABLE",
                          "consultationFeePaise":0
                        }
                        """
                            .formatted(name)))
            .andExpect(status().isOk())
            .andReturn();
    return UUID.fromString(
        objectMapper
            .readTree(result.getResponse().getContentAsString())
            .path("data")
            .path("id")
            .asText());
  }

  private Customer persistCustomer(UUID tenantId, String name, String phone) {
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setTenantId(tenantId);
    customer.setName(name);
    customer.setPhone(phone);
    customer.setCreatedAt(T0);
    customer.setUpdatedAt(T0);
    return customerRepository.saveAndFlush(customer);
  }

  private String admitJson(
      String name,
      String uhid,
      UUID wardId,
      UUID bedId,
      String phone,
      Integer age,
      String gender,
      UUID attendingDoctorId,
      String diagnosis,
      String payerType,
      String insurerName,
      String policyNumber) {
    return """
        {
          "patientName":"%s",
          "uhid":"%s",
          "wardId":"%s",
          "bedId":"%s",
          "phone":%s,
          "age":%s,
          "gender":%s,
          "attendingDoctorId":%s,
          "diagnosis":%s,
          "payerType":"%s",
          "insurerName":%s,
          "policyNumber":%s
        }
        """
        .formatted(
            name,
            uhid,
            wardId,
            bedId,
            jsonString(phone),
            age == null ? "null" : age.toString(),
            jsonString(gender),
            attendingDoctorId == null ? "null" : "\"" + attendingDoctorId + "\"",
            jsonString(diagnosis),
            payerType,
            jsonString(insurerName),
            jsonString(policyNumber));
  }

  private static String jsonString(String value) {
    if (value == null) {
      return "null";
    }
    return "\"" + value + "\"";
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

  private AuthPrincipal authPrincipal(Fixture fx) {
    AppUser owner =
        appUserRepository.findAll().stream()
            .filter(user -> user.getEmail().equals("owner@" + fx.slug() + ".local"))
            .findFirst()
            .orElseThrow();
    return new AuthPrincipal(owner.getId(), fx.tenantId(), UUID.randomUUID(), owner.getRole())
        .withActiveBranchId(fx.branchId());
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

  private Location persistBranch(UUID tenantId, String name, String code) {
    return persistBranch(tenantId, name, code, true);
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

  private record WardBed(UUID wardId, UUID freeBedId, MvcResult wardResult) {}
}
