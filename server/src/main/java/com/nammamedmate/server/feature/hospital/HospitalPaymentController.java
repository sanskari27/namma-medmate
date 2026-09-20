package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalPaymentCommand;
import com.nammamedmate.server.application.hospital.HospitalPaymentService;
import com.nammamedmate.server.application.hospital.HospitalPaymentView;
import com.nammamedmate.server.application.hospital.HospitalReminderView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/payments")
public class HospitalPaymentController {

  private final HospitalPaymentService hospitalPaymentService;

  public HospitalPaymentController(HospitalPaymentService hospitalPaymentService) {
    this.hospitalPaymentService = hospitalPaymentService;
  }

  @PostMapping
  public ApiResponse<PaymentResponse> pay(
      Authentication authentication, @Valid @RequestBody CreatePaymentRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            hospitalPaymentService.pay(
                principal,
                new HospitalPaymentCommand(
                    request.amountPaise(),
                    request.mode(),
                    request.reference(),
                    request.idempotencyKey(),
                    request.expectedAccountVersion()))));
  }

  @PostMapping("/reminder")
  public ApiResponse<ReminderResponse> remind(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    HospitalReminderView view = hospitalPaymentService.remind(principal);
    return ApiResponse.ok(new ReminderResponse(view.sent(), view.replayed()));
  }

  private static PaymentResponse toResponse(HospitalPaymentView view) {
    return new PaymentResponse(
        view.id(),
        view.amountPaise(),
        view.mode(),
        view.reference(),
        view.balancePaise(),
        view.accountVersion(),
        view.occurredAt());
  }

  public record CreatePaymentRequest(
      @Positive long amountPaise,
      @NotBlank @Size(max = 64) String mode,
      @Size(max = 80) String reference,
      @NotBlank @Size(max = 80) String idempotencyKey,
      Long expectedAccountVersion) {}

  public record PaymentResponse(
      UUID id,
      long amountPaise,
      String mode,
      String reference,
      long balancePaise,
      long accountVersion,
      Instant occurredAt) {}

  public record ReminderResponse(boolean sent, boolean replayed) {}
}
