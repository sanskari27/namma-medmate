package com.nammamedmate.server.application.doctor;

import com.nammamedmate.server.application.access.AccessQueryService;
import com.nammamedmate.server.domain.AppUser;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.Doctor;
import com.nammamedmate.server.domain.ModuleCode;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.AppUserRepository;
import com.nammamedmate.server.persistence.CustomerHistoryFactRepository;
import com.nammamedmate.server.persistence.DoctorRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DoctorService {

  static final String REGISTRATION_TAKEN_CODE = "REGISTRATION_TAKEN";
  static final String REGISTRATION_TAKEN_MESSAGE =
      "A doctor with this registration number already exists.";

  private final DoctorRepository doctorRepository;
  private final CustomerHistoryFactRepository customerHistoryFactRepository;
  private final AppUserRepository appUserRepository;
  private final AccessQueryService accessQueryService;
  private final Clock clock;

  public DoctorService(
      DoctorRepository doctorRepository,
      CustomerHistoryFactRepository customerHistoryFactRepository,
      AppUserRepository appUserRepository,
      AccessQueryService accessQueryService,
      Clock clock) {
    this.doctorRepository = doctorRepository;
    this.customerHistoryFactRepository = customerHistoryFactRepository;
    this.appUserRepository = appUserRepository;
    this.accessQueryService = accessQueryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<DoctorView> list(AuthPrincipal principal) {
    UUID tenantId = requireCrmAccess(principal);
    return doctorRepository.findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(tenantId).stream()
        .map(DoctorService::toView)
        .toList();
  }

  @Transactional(readOnly = true)
  public DoctorView get(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireCrmAccess(principal);
    return toView(requireDoctor(id, tenantId));
  }

  @Transactional
  public DoctorView create(
      AuthPrincipal principal, String name, String registrationNumber, String phone, String notes) {
    UUID tenantId = requireCrmAccess(principal);
    String normalizedName = requireName(name);
    String normalizedRegistration = blankToNull(registrationNumber);
    assertRegistrationAvailable(tenantId, normalizedRegistration, null);

    Instant now = clock.instant();
    Doctor doctor = new Doctor();
    doctor.setId(UUID.randomUUID());
    doctor.setTenantId(tenantId);
    doctor.setName(normalizedName);
    doctor.setRegistrationNumber(normalizedRegistration);
    doctor.setPhone(blankToNull(phone));
    doctor.setNotes(blankToNull(notes));
    doctor.setCreatedAt(now);
    doctor.setUpdatedAt(now);
    return toView(doctorRepository.save(doctor));
  }

  @Transactional
  public DoctorView update(
      AuthPrincipal principal,
      UUID id,
      String name,
      String registrationNumber,
      String phone,
      String notes) {
    UUID tenantId = requireCrmAccess(principal);
    Doctor doctor = requireDoctor(id, tenantId);
    String normalizedName = requireName(name);
    String normalizedRegistration = blankToNull(registrationNumber);
    assertRegistrationAvailable(tenantId, normalizedRegistration, id);

    doctor.setName(normalizedName);
    doctor.setRegistrationNumber(normalizedRegistration);
    doctor.setPhone(blankToNull(phone));
    doctor.setNotes(blankToNull(notes));
    doctor.setUpdatedAt(clock.instant());
    return toView(doctorRepository.save(doctor));
  }

  @Transactional
  public DoctorView deactivate(AuthPrincipal principal, UUID id) {
    UUID tenantId = requireCrmAccess(principal);
    Doctor doctor = requireDoctor(id, tenantId);
    Instant now = clock.instant();
    doctor.setDeletedAt(now);
    doctor.setUpdatedAt(now);
    return toView(doctorRepository.save(doctor));
  }

  @Transactional(readOnly = true)
  public List<TopReferringDoctorView> topReferring(AuthPrincipal principal, int limit) {
    UUID tenantId = requireCrmAccess(principal);
    int capped = Math.min(Math.max(limit, 1), 50);
    List<CustomerHistoryFactRepository.DoctorReferralCount> counts =
        customerHistoryFactRepository.countReferralsByDoctor(tenantId);
    if (counts.isEmpty()) {
      return List.of();
    }
    Map<UUID, Doctor> doctors = new HashMap<>();
    for (Doctor doctor :
        doctorRepository.findAllById(
            counts.stream()
                .map(CustomerHistoryFactRepository.DoctorReferralCount::getDoctorId)
                .toList())) {
      if (tenantId.equals(doctor.getTenantId()) && doctor.getDeletedAt() == null) {
        doctors.put(doctor.getId(), doctor);
      }
    }
    List<TopReferringDoctorView> result = new ArrayList<>();
    for (CustomerHistoryFactRepository.DoctorReferralCount row : counts) {
      Doctor doctor = doctors.get(row.getDoctorId());
      if (doctor == null) {
        continue;
      }
      result.add(
          new TopReferringDoctorView(
              doctor.getId(),
              doctor.getName(),
              doctor.getRegistrationNumber(),
              row.getReferralCount()));
      if (result.size() >= capped) {
        break;
      }
    }
    return result;
  }

  private Doctor requireDoctor(UUID id, UUID tenantId) {
    return doctorRepository
        .findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Doctor was not found"));
  }

  private void assertRegistrationAvailable(UUID tenantId, String registration, UUID excludeId) {
    if (registration == null) {
      return;
    }
    doctorRepository
        .findByTenantIdAndRegistrationNumberAndDeletedAtIsNull(tenantId, registration)
        .ifPresent(
            existing -> {
              if (excludeId == null || !existing.getId().equals(excludeId)) {
                throw new ApiException(
                    HttpStatus.CONFLICT, REGISTRATION_TAKEN_CODE, REGISTRATION_TAKEN_MESSAGE);
              }
            });
  }

  private UUID requireCrmAccess(AuthPrincipal principal) {
    if (principal == null || principal.tenantId() == null) {
      throw forbidden();
    }
    if (principal.role() != AppUserRole.pharmacy_owner
        && principal.role() != AppUserRole.pharmacy_staff) {
      throw forbidden();
    }
    AppUser user =
        appUserRepository
            .findById(principal.userId())
            .filter(row -> row.getDeletedAt() == null)
            .orElseThrow(DoctorService::forbidden);
    if (!accessQueryService.effectiveModules(user).contains(ModuleCode.CRM)) {
      throw forbidden();
    }
    return principal.tenantId();
  }

  private static String requireName(String name) {
    if (name == null || name.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    String trimmed = name.trim();
    if (trimmed.length() > 200) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    return trimmed;
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static DoctorView toView(Doctor doctor) {
    return new DoctorView(
        doctor.getId(),
        doctor.getTenantId(),
        doctor.getName(),
        doctor.getRegistrationNumber(),
        doctor.getPhone(),
        doctor.getNotes(),
        doctor.getCreatedAt(),
        doctor.getUpdatedAt());
  }

  private static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden");
  }
}
