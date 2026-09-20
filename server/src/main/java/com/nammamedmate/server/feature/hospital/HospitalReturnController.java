package com.nammamedmate.server.feature.hospital;

import com.nammamedmate.server.application.hospital.HospitalReturnCommand;
import com.nammamedmate.server.application.hospital.HospitalReturnService;
import com.nammamedmate.server.application.hospital.HospitalReturnView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hospital/returns")
public class HospitalReturnController {

  private final HospitalReturnService hospitalReturnService;

  public HospitalReturnController(HospitalReturnService hospitalReturnService) {
    this.hospitalReturnService = hospitalReturnService;
  }

  @PostMapping
  public ApiResponse<ReturnResponse> create(
      Authentication authentication, @Valid @RequestBody CreateReturnRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toResponse(
            hospitalReturnService.create(
                principal,
                new HospitalReturnCommand(
                    request.issueId(),
                    request.idempotencyKey(),
                    request.lines().stream()
                        .map(
                            line ->
                                new HospitalReturnCommand.Line(line.productId(), line.quantity()))
                        .toList()))));
  }

  private static ReturnResponse toResponse(HospitalReturnView view) {
    return new ReturnResponse(
        view.id(),
        view.issueId(),
        view.invoiceNumber(),
        view.wardId(),
        view.wardName(),
        view.creditPaise(),
        view.occurredAt(),
        view.lines().stream()
            .map(
                line ->
                    new LineResponse(
                        line.id(),
                        line.productId(),
                        line.productName(),
                        line.quantity(),
                        line.amountPaise()))
            .toList());
  }

  public record CreateReturnRequest(
      @NotNull UUID issueId,
      @NotBlank @Size(max = 80) String idempotencyKey,
      @NotEmpty List<LineRequest> lines) {}

  public record LineRequest(@NotNull UUID productId, @NotNull BigDecimal quantity) {}

  public record ReturnResponse(
      UUID id,
      UUID issueId,
      String invoiceNumber,
      UUID wardId,
      String wardName,
      long creditPaise,
      Instant occurredAt,
      List<LineResponse> lines) {}

  public record LineResponse(
      UUID id, UUID productId, String productName, BigDecimal quantity, long amountPaise) {}
}
