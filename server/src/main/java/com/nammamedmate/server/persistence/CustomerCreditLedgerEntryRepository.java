package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerCreditLedgerEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerCreditLedgerEntryRepository
    extends JpaRepository<CustomerCreditLedgerEntry, UUID> {

  List<CustomerCreditLedgerEntry> findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
      UUID tenantId, UUID customerId);

  Optional<CustomerCreditLedgerEntry> findByTenantIdAndIdempotencyKey(
      UUID tenantId, String idempotencyKey);
}
