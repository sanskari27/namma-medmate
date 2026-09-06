package com.nammamedmate.server.feature.customreport;

import com.nammamedmate.server.application.customreport.CustomReportCatalogView;
import com.nammamedmate.server.application.customreport.CustomReportExport;
import com.nammamedmate.server.application.customreport.CustomReportPreviewView;
import com.nammamedmate.server.application.customreport.CustomReportQuery;
import com.nammamedmate.server.application.customreport.CustomReportService;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports/custom")
public class CustomReportController {

  private final CustomReportService customReportService;

  public CustomReportController(CustomReportService customReportService) {
    this.customReportService = customReportService;
  }

  @GetMapping
  public ApiResponse<CustomReportCatalogView> catalog(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(customReportService.catalog(principal));
  }

  @PostMapping("/preview")
  public ApiResponse<CustomReportPreviewView> preview(
      Authentication authentication, @RequestBody QueryRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(customReportService.preview(principal, toQuery(request)));
  }

  @PostMapping("/export")
  public ResponseEntity<byte[]> export(
      Authentication authentication,
      @RequestParam(required = false) String format,
      @RequestBody QueryRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    CustomReportExport file = customReportService.export(principal, toQuery(request), format);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.body());
  }

  private static CustomReportQuery toQuery(QueryRequest request) {
    if (request == null) {
      return new CustomReportQuery(null, List.of(), List.of(), null, null, null, null);
    }
    List<CustomReportQuery.Filter> filters = new java.util.ArrayList<>();
    if (request.filters() != null) {
      for (FilterRequest filter : request.filters()) {
        if (filter == null) {
          continue;
        }
        filters.add(
            new CustomReportQuery.Filter(filter.field(), filter.operator(), filter.value()));
      }
    }
    return new CustomReportQuery(
        request.dataset(),
        request.columns(),
        List.copyOf(filters),
        request.from(),
        request.to(),
        request.branchId(),
        request.scope());
  }

  public record QueryRequest(
      String dataset,
      List<String> columns,
      List<FilterRequest> filters,
      LocalDate from,
      LocalDate to,
      String branchId,
      String scope) {}

  public record FilterRequest(String field, String operator, String value) {}
}
