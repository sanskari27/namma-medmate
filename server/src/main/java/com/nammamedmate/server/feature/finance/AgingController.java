package com.nammamedmate.server.feature.finance;

import com.nammamedmate.server.application.finance.AgingService;
import com.nammamedmate.server.application.finance.AgingView;
import com.nammamedmate.server.domain.AgingBucket;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance")
public class AgingController {

  private final AgingService agingService;

  public AgingController(AgingService agingService) {
    this.agingService = agingService;
  }

  @GetMapping("/receivables")
  public ApiResponse<AgingResponse> receivables(
      Authentication authentication,
      @RequestParam(required = false) LocalDate asOf,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(agingService.receivables(principal, asOf, branchId, scope)));
  }

  @GetMapping("/payables")
  public ApiResponse<AgingResponse> payables(
      Authentication authentication,
      @RequestParam(required = false) LocalDate asOf,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toResponse(agingService.payables(principal, asOf, branchId, scope)));
  }

  private AgingResponse toResponse(AgingView view) {
    return new AgingResponse(
        view.asOf(),
        view.scope(),
        view.branchId(),
        view.totalPaise(),
        view.sourceBalancePaise(),
        view.buckets().stream()
            .map(bucket -> new BucketResponse(bucket.key(), bucket.label(), bucket.totalPaise()))
            .toList(),
        view.items().stream()
            .map(
                item ->
                    new PartyResponse(
                        item.partyId(),
                        item.name(),
                        item.amountPaise(),
                        item.days(),
                        item.ageOn(),
                        item.branchId()))
            .toList());
  }

  public record AgingResponse(
      LocalDate asOf,
      String scope,
      UUID branchId,
      long totalPaise,
      long sourceBalancePaise,
      List<BucketResponse> buckets,
      List<PartyResponse> items) {}

  public record BucketResponse(AgingBucket key, String label, long totalPaise) {}

  public record PartyResponse(
      UUID partyId, String name, long amountPaise, int days, LocalDate ageOn, UUID branchId) {}
}
