package com.nammamedmate.server.application.sales;

import com.nammamedmate.server.application.approval.ApprovalDecisionListener;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.domain.DiscountApprovalStatus;
import com.nammamedmate.server.domain.SalesInvoice;
import com.nammamedmate.server.persistence.SalesInvoiceRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SalesInvoiceDiscountApplier implements ApprovalDecisionListener {

  private final SalesInvoiceRepository salesInvoiceRepository;
  private final Clock clock;

  public SalesInvoiceDiscountApplier(SalesInvoiceRepository salesInvoiceRepository, Clock clock) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.clock = clock;
  }

  @Override
  @Transactional
  public void onDecided(
      UUID requestId, ApprovalDecisionOutcome outcome, UUID actorUserId, Instant decidedAt) {
    Optional<SalesInvoice> locked =
        salesInvoiceRepository.lockByDiscountApprovalRequestId(requestId);
    if (locked.isEmpty()) {
      return;
    }
    SalesInvoice invoice = locked.get();
    if (invoice.getDiscountApprovalStatus() != DiscountApprovalStatus.PENDING) {
      return;
    }
    Instant now = decidedAt == null ? clock.instant() : decidedAt;
    invoice.setDiscountApprovalStatus(
        outcome == ApprovalDecisionOutcome.APPROVED
            ? DiscountApprovalStatus.APPROVED
            : DiscountApprovalStatus.REJECTED);
    invoice.setUpdatedAt(now);
    invoice.setVersion(invoice.getVersion() + 1);
    salesInvoiceRepository.saveAndFlush(invoice);
  }
}
