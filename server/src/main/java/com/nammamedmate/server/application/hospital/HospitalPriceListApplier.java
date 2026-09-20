package com.nammamedmate.server.application.hospital;

import com.nammamedmate.server.application.approval.ApprovalDecisionListener;
import com.nammamedmate.server.domain.ApprovalActionKey;
import com.nammamedmate.server.domain.ApprovalDecisionOutcome;
import com.nammamedmate.server.domain.ApprovalRequest;
import com.nammamedmate.server.domain.ApprovalRequestStatus;
import com.nammamedmate.server.persistence.ApprovalRequestRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class HospitalPriceListApplier implements ApprovalDecisionListener {

  private final ApprovalRequestRepository approvalRequestRepository;
  private final HospitalService hospitalService;

  public HospitalPriceListApplier(
      ApprovalRequestRepository approvalRequestRepository, @Lazy HospitalService hospitalService) {
    this.approvalRequestRepository = approvalRequestRepository;
    this.hospitalService = hospitalService;
  }

  @Override
  @Transactional
  public void onDecided(
      UUID requestId,
      ApprovalDecisionOutcome outcome,
      UUID actorUserId,
      Instant decidedAt,
      UUID tenantId) {
    ApprovalRequest request =
        approvalRequestRepository.findByIdAndTenantId(requestId, tenantId).orElse(null);
    if (request == null || request.getActionKey() != ApprovalActionKey.HOSPITAL_PRICE_LIST) {
      return;
    }
    if (request.getStatus() != ApprovalRequestStatus.APPROVED
        && request.getStatus() != ApprovalRequestStatus.REJECTED) {
      return;
    }
    if (outcome == ApprovalDecisionOutcome.APPROVED) {
      hospitalService.applyApprovedPriceList(tenantId, requestId, request.getContextJson());
      return;
    }
    hospitalService.clearPendingApproval(tenantId, requestId);
  }
}
