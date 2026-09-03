package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.KioskTicket;
import com.nammamedmate.server.domain.KioskTicketStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KioskTicketRepository extends JpaRepository<KioskTicket, UUID> {

  List<KioskTicket> findByTenantIdAndBranchIdAndSessionIdAndStatusOrderByTokenAsc(
      UUID tenantId, UUID branchId, UUID sessionId, KioskTicketStatus status);

  Optional<KioskTicket> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  long countByTenantIdAndBranchIdAndSessionId(UUID tenantId, UUID branchId, UUID sessionId);
}
