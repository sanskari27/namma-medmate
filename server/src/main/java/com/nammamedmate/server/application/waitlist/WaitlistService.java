package com.nammamedmate.server.application.waitlist;

import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.WaitlistSignup;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.WaitlistSignupRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WaitlistService {

  private static final Pattern PHONE = Pattern.compile("[6-9][0-9]{9}");
  private static final Pattern PINCODE = Pattern.compile("5[0-9]{5}");
  private static final Set<String> GENDERS = Set.of("female", "male", "other", "prefer-not-to-say");

  private final WaitlistSignupRepository waitlistSignupRepository;
  private final Clock clock;

  public WaitlistService(WaitlistSignupRepository waitlistSignupRepository, Clock clock) {
    this.waitlistSignupRepository = waitlistSignupRepository;
    this.clock = clock;
  }

  @Transactional
  public WaitlistSignupView join(WaitlistJoin join) {
    if (join != null && filled(join.companyWebsite())) {
      return null;
    }
    WaitlistJoin clean = requireValid(join);
    WaitlistSignup row = new WaitlistSignup();
    row.setId(UUID.randomUUID());
    row.setName(clean.name());
    row.setPhone(clean.phone());
    row.setPincode(clean.pincode());
    row.setAge(clean.age());
    row.setGender(clean.gender());
    row.setConsent(true);
    row.setSource(clean.source());
    row.setLang(clean.lang());
    row.setOffer(clean.offer());
    row.setCreatedAt(clock.instant());
    return toView(waitlistSignupRepository.save(row));
  }

  @Transactional(readOnly = true)
  public List<WaitlistSignupView> list(AuthPrincipal principal) {
    if (principal == null || principal.hqRole() != AppUserRole.admin_super) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied");
    }
    return waitlistSignupRepository.findAllByOrderByCreatedAtDesc().stream()
        .map(WaitlistService::toView)
        .toList();
  }

  private static WaitlistJoin requireValid(WaitlistJoin join) {
    if (join == null) {
      throw invalid();
    }
    String name = trim(join.name());
    String phone = trim(join.phone());
    String pincode = trim(join.pincode());
    String gender = trim(join.gender());
    String source = trim(join.source());
    String lang = trim(join.lang());
    String offer = trim(join.offer());
    if (name.isEmpty()
        || name.length() > 200
        || !PHONE.matcher(phone).matches()
        || !PINCODE.matcher(pincode).matches()
        || join.age() == null
        || join.age() < 18
        || join.age() > 120
        || !GENDERS.contains(gender)
        || !Boolean.TRUE.equals(join.consent())
        || source.isEmpty()
        || source.length() > 80
        || lang.isEmpty()
        || lang.length() > 16
        || offer.isEmpty()
        || offer.length() > 64) {
      throw invalid();
    }
    return new WaitlistJoin(
        name, phone, pincode, join.age(), gender, true, source, lang, offer, null);
  }

  private static boolean filled(String value) {
    return value != null && !value.isBlank();
  }

  private static String trim(String value) {
    return value == null ? "" : value.trim();
  }

  private static ApiException invalid() {
    return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private static WaitlistSignupView toView(WaitlistSignup row) {
    return new WaitlistSignupView(
        row.getId(),
        row.getName(),
        row.getPhone(),
        row.getPincode(),
        row.getAge(),
        row.getGender(),
        row.isConsent(),
        row.getSource(),
        row.getLang(),
        row.getOffer(),
        row.getCreatedAt());
  }
}
