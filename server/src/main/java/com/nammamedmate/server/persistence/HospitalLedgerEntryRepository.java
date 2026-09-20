package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalLedgerEntry;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalLedgerEntryRepository extends JpaRepository<HospitalLedgerEntry, UUID> {

  Optional<HospitalLedgerEntry> findByTenantIdAndIdempotencyKey(
      UUID tenantId, String idempotencyKey);

  List<HospitalLedgerEntry> findAllByTenantIdAndAccountIdOrderByOccurredAtAscCreatedAtAsc(
      UUID tenantId, UUID accountId);

  List<HospitalLedgerEntry>
      findAllByTenantIdAndAccountIdAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAscCreatedAtAsc(
          UUID tenantId, UUID accountId, Instant fromInclusive, Instant toExclusive);
}
