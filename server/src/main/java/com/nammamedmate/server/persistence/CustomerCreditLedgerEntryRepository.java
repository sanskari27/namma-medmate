package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerCreditLedgerEntryRepository
    extends JpaRepository<CustomerCreditLedgerEntry, UUID> {

  List<CustomerCreditLedgerEntry> findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
      UUID tenantId, UUID customerId);

  Optional<CustomerCreditLedgerEntry> findByTenantIdAndIdempotencyKey(
      UUID tenantId, String idempotencyKey);

  List<CustomerCreditLedgerEntry> findAllByTenantIdAndCustomerIdInOrderByOccurredAtDesc(
      UUID tenantId, List<UUID> customerIds);

  @Query(
      """
      select e from CustomerCreditLedgerEntry e
      where e.tenantId = :tenantId and e.occurredAt <= :cutoff
      order by e.occurredAt asc, e.id asc
      """)
  List<CustomerCreditLedgerEntry> findAllByTenantIdAndOccurredAtOnOrBefore(
      @Param("tenantId") UUID tenantId, @Param("cutoff") Instant cutoff);
}
