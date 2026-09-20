package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.domain.AgingBucket;
import com.nammamedmate.server.domain.AgingPolicy;
import com.nammamedmate.server.domain.HospitalCreditAccount;
import com.nammamedmate.server.domain.HospitalIssue;
import com.nammamedmate.server.domain.HospitalIssueReason;
import com.nammamedmate.server.domain.HospitalLedgerEntry;
import com.nammamedmate.server.domain.HospitalLedgerKind;
import com.nammamedmate.server.domain.HospitalPolicy;
import com.nammamedmate.server.infrastructure.pdf.FinanceReportPdfRenderer;
import com.nammamedmate.server.infrastructure.security.AuthPrincipal;
import com.nammamedmate.server.persistence.HospitalCreditAccountRepository;
import com.nammamedmate.server.persistence.HospitalIssueRepository;
import com.nammamedmate.server.persistence.HospitalLedgerEntryRepository;
import com.nammamedmate.server.shared.exception.ApiException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalStatementService {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final List<String> COLUMNS =
      List.of("Date", "Particulars", "Debit", "Credit", "Balance");

  private final HospitalArAccess access;
  private final HospitalCreditAccountRepository accountRepository;
  private final HospitalLedgerEntryRepository ledgerRepository;
  private final HospitalIssueRepository issueRepository;
  private final FinanceReportPdfRenderer pdfRenderer;
  private final Clock clock;

  public HospitalStatementService(
      HospitalArAccess access,
      HospitalCreditAccountRepository accountRepository,
      HospitalLedgerEntryRepository ledgerRepository,
      HospitalIssueRepository issueRepository,
      FinanceReportPdfRenderer pdfRenderer,
      Clock clock) {
    this.access = access;
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
    this.issueRepository = issueRepository;
    this.pdfRenderer = pdfRenderer;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public HospitalStatementView get(
      AuthPrincipal principal, LocalDate from, LocalDate to, boolean includePatient) {
    HospitalArAccess.BranchContext ctx = access.requireAccountWriter(principal);
    return build(ctx, from, to, includePatient);
  }

  @Transactional(readOnly = true)
  public HospitalStatementExport export(
      AuthPrincipal principal,
      LocalDate from,
      LocalDate to,
      boolean includePatient,
      String format) {
    HospitalStatementView view = get(principal, from, to, includePatient);
    String normalized = format == null ? "" : format.trim().toLowerCase();
    List<Map<String, String>> rows = csvRows(view);
    if ("csv".equals(normalized)) {
      byte[] bytes = csv(COLUMNS, rows).getBytes(StandardCharsets.UTF_8);
      return new HospitalStatementExport("hospital-statement.csv", "text/csv", bytes);
    }
    if ("pdf".equals(normalized)) {
      byte[] bytes = pdfRenderer.render("Hospital account statement", COLUMNS, rows);
      return new HospitalStatementExport(
          "hospital-statement.pdf", MediaType.APPLICATION_PDF_VALUE, bytes);
    }
    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
  }

  private HospitalStatementView build(
      HospitalArAccess.BranchContext ctx, LocalDate from, LocalDate to, boolean includePatient) {
    HospitalCreditAccount account =
        accountRepository
            .findByTenantId(ctx.tenantId())
            .orElseThrow(HospitalPolicy::accountRequired);
    LocalDate today = AgingPolicy.today(clock.instant());
    LocalDate startDate = from == null ? LocalDate.of(2000, 1, 1) : from;
    LocalDate endDate = to == null ? today : to;
    if (endDate.isBefore(startDate)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request");
    }
    Instant start = startDate.atStartOfDay(IST).toInstant();
    Instant endExclusive = endDate.plusDays(1).atStartOfDay(IST).toInstant();
    List<HospitalLedgerEntry> all =
        ledgerRepository.findAllByTenantIdAndAccountIdOrderByOccurredAtAscCreatedAtAsc(
            ctx.tenantId(), account.getId());
    long running = 0L;
    long opening = 0L;
    List<HospitalStatementView.Line> lines = new ArrayList<>();
    long supplied = 0L;
    long credits = 0L;
    Map<UUID, HospitalIssue> issues = loadIssues(ctx.tenantId(), all);
    for (HospitalLedgerEntry entry : all) {
      running += entry.getDebitPaise() - entry.getCreditPaise();
      boolean inWindow =
          !entry.getOccurredAt().isBefore(start) && entry.getOccurredAt().isBefore(endExclusive);
      if (!inWindow) {
        if (entry.getOccurredAt().isBefore(start)) {
          opening = running;
        }
        continue;
      }
      if (entry.getKind() == HospitalLedgerKind.ISSUE) {
        supplied += entry.getDebitPaise();
      } else {
        credits += entry.getCreditPaise();
      }
      lines.add(
          new HospitalStatementView.Line(
              entry.getOccurredAt(),
              entry.getKind().name(),
              particulars(entry, issues.get(entry.getIssueId()), includePatient),
              entry.getDebitPaise(),
              entry.getCreditPaise(),
              running));
    }
    return new HospitalStatementView(
        opening,
        supplied,
        credits,
        running,
        account.getBalancePaise(),
        account.getVersion(),
        account.getInstitutionName(),
        ageing(all, issues, today, account.getBalancePaise()),
        lines);
  }

  private Map<UUID, HospitalIssue> loadIssues(UUID tenantId, List<HospitalLedgerEntry> entries) {
    List<UUID> ids =
        entries.stream()
            .map(HospitalLedgerEntry::getIssueId)
            .filter(id -> id != null)
            .distinct()
            .toList();
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, HospitalIssue> map = new LinkedHashMap<>();
    for (HospitalIssue issue : issueRepository.findAllByIdInAndTenantId(ids, tenantId)) {
      map.put(issue.getId(), issue);
    }
    return map;
  }

  private static String particulars(
      HospitalLedgerEntry entry, HospitalIssue issue, boolean includePatient) {
    if (entry.getParticulars() != null && !entry.getParticulars().isBlank()) {
      String base = entry.getParticulars();
      if (includePatient
          && issue != null
          && issue.getReason() == HospitalIssueReason.PATIENT_REFILL) {
        String patient =
            (issue.getUhid() == null ? "" : issue.getUhid())
                + (issue.getPatientName() == null || issue.getPatientName().isBlank()
                    ? ""
                    : " " + issue.getPatientName());
        if (!patient.isBlank()) {
          return base + " · " + patient.trim();
        }
      }
      return base;
    }
    if (entry.getKind() == HospitalLedgerKind.ISSUE && issue != null) {
      String base = issue.getInvoiceNumber() + " issued";
      if (includePatient && issue.getReason() == HospitalIssueReason.PATIENT_REFILL) {
        String extra =
            (issue.getUhid() == null ? "" : issue.getUhid())
                + (issue.getPatientName() == null || issue.getPatientName().isBlank()
                    ? ""
                    : " " + issue.getPatientName());
        if (!extra.isBlank()) {
          return base + " · " + extra.trim();
        }
      }
      return base;
    }
    if (entry.getKind() == HospitalLedgerKind.PAYMENT) {
      return "Payment " + (entry.getPaymentMode() == null ? "" : entry.getPaymentMode());
    }
    return entry.getKind().name();
  }

  private HospitalStatementView.Aging ageing(
      List<HospitalLedgerEntry> all,
      Map<UUID, HospitalIssue> issues,
      LocalDate asOf,
      long closing) {
    List<Open> opens = new ArrayList<>();
    for (HospitalLedgerEntry entry : all) {
      if (entry.getKind() == HospitalLedgerKind.ISSUE && entry.getDebitPaise() > 0) {
        HospitalIssue issue = issues.get(entry.getIssueId());
        LocalDate due =
            HospitalPolicy.dueOn(
                issue == null ? null : issue.getCreditTerms(),
                issue == null ? entry.getOccurredAt() : issue.getIssuedAt());
        opens.add(new Open(entry.getDebitPaise(), due));
      } else if (entry.getCreditPaise() > 0) {
        long remaining = entry.getCreditPaise();
        for (Open open : opens) {
          if (remaining <= 0L) {
            break;
          }
          long take = Math.min(open.remaining, remaining);
          open.remaining -= take;
          remaining -= take;
        }
      }
    }
    EnumMap<AgingBucket, Long> buckets = new EnumMap<>(AgingBucket.class);
    for (AgingBucket bucket : AgingPolicy.orderedBuckets()) {
      buckets.put(bucket, 0L);
    }
    long overdue = 0L;
    int oldest = 0;
    for (Open open : opens) {
      if (open.remaining <= 0L) {
        continue;
      }
      int days = AgingPolicy.days(asOf, open.dueOn);
      buckets.merge(AgingPolicy.bucket(days), open.remaining, Long::sum);
      if (days > 0) {
        overdue += open.remaining;
        oldest = Math.max(oldest, days);
      }
    }
    if (closing <= 0L) {
      overdue = 0L;
      oldest = 0;
    }
    return new HospitalStatementView.Aging(
        buckets.get(AgingBucket.D0_30),
        buckets.get(AgingBucket.D31_60),
        buckets.get(AgingBucket.D61_90),
        buckets.get(AgingBucket.D90_PLUS),
        overdue,
        oldest);
  }

  private static List<Map<String, String>> csvRows(HospitalStatementView view) {
    List<Map<String, String>> rows = new ArrayList<>();
    for (HospitalStatementView.Line line : view.lines()) {
      Map<String, String> row = new LinkedHashMap<>();
      row.put("Date", AgingPolicy.istDate(line.occurredAt()).toString());
      row.put("Particulars", line.particulars());
      row.put("Debit", paise(line.debitPaise()));
      row.put("Credit", paise(line.creditPaise()));
      row.put("Balance", paise(line.balancePaise()));
      rows.add(row);
    }
    return rows;
  }

  private static String csv(List<String> columns, List<Map<String, String>> items) {
    StringBuilder out = new StringBuilder();
    out.append(String.join(",", columns)).append('\n');
    for (Map<String, String> item : items) {
      List<String> cells = new ArrayList<>();
      for (String column : columns) {
        String value = item.getOrDefault(column, "");
        cells.add(value.contains(",") ? "\"" + value.replace("\"", "\"\"") + "\"" : value);
      }
      out.append(String.join(",", cells)).append('\n');
    }
    return out.toString();
  }

  private static String paise(long value) {
    return String.format("%.2f", value / 100.0);
  }

  private static final class Open {
    private long remaining;
    private final LocalDate dueOn;

    private Open(long remaining, LocalDate dueOn) {
      this.remaining = remaining;
      this.dueOn = dueOn;
    }
  }
}
