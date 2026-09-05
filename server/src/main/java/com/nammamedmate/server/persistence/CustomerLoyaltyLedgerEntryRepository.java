package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerLoyaltyLedgerEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerLoyaltyLedgerEntryRepository
    extends JpaRepository<CustomerLoyaltyLedgerEntry, UUID> {

  List<CustomerLoyaltyLedgerEntry> findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
      UUID tenantId, UUID customerId);

  Optional<CustomerLoyaltyLedgerEntry> findByTenantIdAndIdempotencyKey(
      UUID tenantId, String idempotencyKey);
}
