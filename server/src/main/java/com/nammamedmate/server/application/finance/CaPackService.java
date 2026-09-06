package com.nammamedmate.server.application.finance;

import com.nammamedmate.server.application.audit.AuditRecordCommand;
import com.nammamedmate.server.application.audit.AuditService;
import com.nammamedmate.server.domain.AppUserRole;
import com.nammamedmate.server.domain.FinanceAccessPolicy;
import com.nammamedmate.server.domain.FinanceReportKey;
import com.nammamedmate.server.domain.FinanceReportPolicy;
import com.nammamedmate.server.infrastructure.pdf.CaPackPdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaPackService {

  private static final List<FinanceReportKey> CORE_KEYS =
      List.of(
          FinanceReportKey.DAY_BOOK,
          FinanceReportKey.SALES_SUMMARY,
          FinanceReportKey.PURCHASE_SUMMARY,
          FinanceReportKey.EXPENSE_SUMMARY,
          FinanceReportKey.PROFIT_AND_LOSS,
          FinanceReportKey.GSTR1,
          FinanceReportKey.GSTR3B);

  private final FinanceReportService financeReportService;
  private final AgingService agingService;
  private final AuditService auditService;
  private final CaPackPdfRenderer pdfRenderer;

  public CaPackService(
      FinanceReportService financeReportService,
      AgingService agingService,
      AuditService auditService,
      CaPackPdfRenderer pdfRenderer) {
    this.financeReportService = financeReportService;
    this.agingService = agingService;
    this.auditService = auditService;
    this.pdfRenderer = pdfRenderer;
  }

  @Transactional(readOnly = true)
  public CaPackView preview(
      AuthPrincipal principal, LocalDate from, LocalDate to, String branchId, String scope) {
    List<CaPackSection> sections = new ArrayList<>();
    FinanceReportTableView first = null;
    for (FinanceReportKey key : CORE_KEYS) {
      FinanceReportTableView table =
          financeReportService.table(principal, key.name(), from, to, branchId, scope);
      if (first == null) {
        first = table;
      }
      sections.add(fromTable(table));
    }
    boolean tenantScope = "tenant".equalsIgnoreCase(scope == null ? "" : scope.trim());
    if (principal.role() == AppUserRole.pharmacy_owner && tenantScope) {
      sections.add(
          fromTable(
              financeReportService.table(
                  principal, FinanceReportKey.BRANCH_PNL.name(), from, to, branchId, scope)));
    }
    LocalDate asOf = first == null ? to : first.to();
    sections.add(
        fromAging(
            "RECEIVABLES",
            "Khata dues",
            agingService.receivables(principal, asOf, branchId, scope)));
    sections.add(
        fromAging(
            "PAYABLES", "Stockist dues", agingService.payables(principal, asOf, branchId, scope)));
    Instant generatedAt = first == null ? Instant.now() : first.generatedAt();
    return new CaPackView(
        first == null ? from : first.from(),
        first == null ? to : first.to(),
        first == null ? (tenantScope ? "tenant" : "branch") : first.scope(),
        first == null ? null : first.branchId(),
        generatedAt,
        List.copyOf(sections));
  }

  @Transactional
  public FinanceReportExport export(
      AuthPrincipal principal,
      String format,
      LocalDate from,
      LocalDate to,
      String branchId,
      String scope) {
    FinanceAccessPolicy.requirePdf(format);
    CaPackView pack = preview(principal, from, to, branchId, scope);
    int rows = 0;
    for (CaPackSection section : pack.sections()) {
      rows += section.items().size();
    }
    FinanceReportPolicy.requireExportSize(rows);
    byte[] body = pdfRenderer.render(pack);
    auditService.record(
        new AuditRecordCommand(
            principal.userId(),
            principal.tenantId(),
            principal.activeBranchId(),
            FinanceAccessPolicy.CA_EXPORT_ACTION,
            AuditService.OUTCOME_SUCCESS,
            null,
            null,
            null,
            principal.sessionId(),
            "{\"format\":\"pdf\",\"from\":\""
                + pack.from()
                + "\",\"to\":\""
                + pack.to()
                + "\",\"scope\":\""
                + pack.scope()
                + "\"}"));
    return new FinanceReportExport("ca-pack.pdf", "application/pdf", body);
  }

  private static CaPackSection fromTable(FinanceReportTableView table) {
    return new CaPackSection(
        table.key(), table.title(), table.totals(), table.columns(), table.items());
  }

  private static CaPackSection fromAging(String key, String title, AgingView view) {
    List<FinanceReportTotal> totals = new ArrayList<>();
    totals.add(new FinanceReportTotal("total", "Total", view.totalPaise()));
    for (AgingView.BucketView bucket : view.buckets()) {
      totals.add(new FinanceReportTotal(bucket.key().name(), bucket.label(), bucket.totalPaise()));
    }
    List<Map<String, String>> items = new ArrayList<>();
    for (AgingView.PartyView party : view.items()) {
      Map<String, String> row = new LinkedHashMap<>();
      row.put("name", party.name() == null ? "" : party.name());
      row.put("amountPaise", Long.toString(party.amountPaise()));
      row.put("days", Integer.toString(party.days()));
      items.add(row);
    }
    return new CaPackSection(
        key,
        title,
        List.copyOf(totals),
        List.of("name", "amountPaise", "days"),
        List.copyOf(items));
  }
}
