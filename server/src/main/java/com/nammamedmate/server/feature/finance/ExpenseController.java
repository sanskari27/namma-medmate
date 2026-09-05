package com.nammamedmate.server.feature.finance;

import com.nammamedmate.server.application.finance.ExpenseCategoryView;
import com.nammamedmate.server.application.finance.ExpenseCommand;
import com.nammamedmate.server.application.finance.ExpenseEvidenceStream;
import com.nammamedmate.server.application.finance.ExpenseService;
import com.nammamedmate.server.application.finance.ExpenseTotalsView;
import com.nammamedmate.server.application.finance.ExpenseView;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.shared.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/finance")
public class ExpenseController {

  private final ExpenseService expenseService;

  public ExpenseController(ExpenseService expenseService) {
    this.expenseService = expenseService;
  }

  @GetMapping("/expense-categories")
  public ApiResponse<CategoryListResponse> categories(Authentication authentication) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new CategoryListResponse(
            expenseService.listCategories(principal).stream().map(this::toCategory).toList()));
  }

  @PostMapping("/expense-categories")
  public ApiResponse<CategoryResponse> createCategory(
      Authentication authentication, @Valid @RequestBody CreateCategoryRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toCategory(expenseService.createCategory(principal, request.code(), request.label())));
  }

  @GetMapping("/expenses")
  public ApiResponse<ExpenseListResponse> list(
      Authentication authentication,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope,
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        new ExpenseListResponse(
            expenseService.list(principal, branchId, scope, categoryId, from, to).stream()
                .map(this::toExpense)
                .toList()));
  }

  @GetMapping("/expenses/totals")
  public ApiResponse<TotalsResponse> totals(
      Authentication authentication,
      @RequestParam(required = false) String branchId,
      @RequestParam(required = false) String scope,
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    ExpenseTotalsView view =
        expenseService.totals(principal, branchId, scope, categoryId, from, to);
    return ApiResponse.ok(
        new TotalsResponse(
            view.totalPaise(),
            view.byCategory().stream()
                .map(
                    item ->
                        new CategoryTotalResponse(
                            item.categoryId(), item.code(), item.label(), item.totalPaise()))
                .toList(),
            view.byBranch().stream()
                .map(
                    item ->
                        new BranchTotalResponse(
                            item.branchId(), item.branchName(), item.totalPaise()))
                .toList()));
  }

  @GetMapping("/expenses/{id}")
  public ApiResponse<ExpenseResponse> get(Authentication authentication, @PathVariable UUID id) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toExpense(expenseService.get(principal, id)));
  }

  @PostMapping("/expenses")
  public ApiResponse<ExpenseResponse> create(
      Authentication authentication, @Valid @RequestBody UpsertExpenseRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toExpense(expenseService.create(principal, toCommand(request, null))));
  }

  @PatchMapping("/expenses/{id}")
  public ApiResponse<ExpenseResponse> update(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpsertExpenseRequest request) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(
        toExpense(
            expenseService.update(principal, id, toCommand(request, request.expectedVersion()))));
  }

  @PostMapping(path = "/expenses/{id}/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<ExpenseResponse> evidence(
      Authentication authentication,
      @PathVariable UUID id,
      @RequestPart("evidence") MultipartFile evidence) {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    return ApiResponse.ok(toExpense(expenseService.attachEvidence(principal, id, evidence)));
  }

  @GetMapping("/expenses/{id}/evidence/{evidenceId}")
  public ResponseEntity<Resource> openEvidence(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID evidenceId)
      throws Exception {
    AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
    ExpenseEvidenceStream stream = expenseService.openEvidence(principal, id, evidenceId);
    Resource resource = new FileSystemResource(stream.path());
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=\"" + stream.filename().replace("\"", "") + "\"")
        .contentType(MediaType.parseMediaType(stream.contentType()))
        .contentLength(Files.size(stream.path()))
        .body(resource);
  }

  private ExpenseCommand toCommand(UpsertExpenseRequest request, Integer expectedVersion) {
    return new ExpenseCommand(
        request.categoryId(),
        request.amountPaise(),
        request.occurredOn(),
        request.notes(),
        request.branchId(),
        request.idempotencyKey(),
        expectedVersion);
  }

  private CategoryResponse toCategory(ExpenseCategoryView view) {
    return new CategoryResponse(
        view.id(), view.tenantId(), view.code(), view.label(), view.system());
  }

  private ExpenseResponse toExpense(ExpenseView view) {
    return new ExpenseResponse(
        view.id(),
        view.tenantId(),
        view.branchId(),
        view.branchName(),
        view.categoryId(),
        view.categoryCode(),
        view.categoryLabel(),
        view.amountPaise(),
        view.occurredOn(),
        view.notes(),
        view.currentEvidenceId(),
        view.version(),
        view.createdAt(),
        view.updatedAt(),
        view.evidence().stream()
            .map(
                item ->
                    new EvidenceResponse(
                        item.id(),
                        item.contentType(),
                        item.byteSize(),
                        item.originalFilename(),
                        item.uploadedAt()))
            .toList());
  }

  public record CreateCategoryRequest(
      @NotBlank @Size(max = 32) String code, @NotBlank @Size(max = 80) String label) {}

  public record UpsertExpenseRequest(
      @NotNull UUID categoryId,
      @NotNull Long amountPaise,
      @NotNull LocalDate occurredOn,
      @Size(max = 500) String notes,
      UUID branchId,
      @Size(max = 128) String idempotencyKey,
      Integer expectedVersion) {}

  public record CategoryListResponse(List<CategoryResponse> items) {}

  public record CategoryResponse(
      UUID id, UUID tenantId, String code, String label, boolean system) {}

  public record ExpenseListResponse(List<ExpenseResponse> items) {}

  public record ExpenseResponse(
      UUID id,
      UUID tenantId,
      UUID branchId,
      String branchName,
      UUID categoryId,
      String categoryCode,
      String categoryLabel,
      long amountPaise,
      LocalDate occurredOn,
      String notes,
      UUID currentEvidenceId,
      int version,
      Instant createdAt,
      Instant updatedAt,
      List<EvidenceResponse> evidence) {}

  public record EvidenceResponse(
      UUID id, String contentType, long byteSize, String originalFilename, Instant uploadedAt) {}

  public record TotalsResponse(
      long totalPaise,
      List<CategoryTotalResponse> byCategory,
      List<BranchTotalResponse> byBranch) {}

  public record CategoryTotalResponse(
      UUID categoryId, String code, String label, long totalPaise) {}

  public record BranchTotalResponse(UUID branchId, String branchName, long totalPaise) {}
}
