package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerLoyaltyLedgerEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerLoyaltyLedgerEntryRepository
    extends JpaRepository<CustomerLoyaltyLedgerEntry, UUID> {

  List<CustomerLoyaltyLedgerEntry> findAllByTenantIdAndCustomerIdOrderByOccurredAtDesc(
      UUID tenantId, UUID customerId);

  Optional<CustomerLoyaltyLedgerEntry> findByTenantIdAndIdempotencyKey(
      UUID tenantId, String idempotencyKey);

  long countByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  @Modifying(clearAutomatically = true)
  @Query(
      """
      update CustomerLoyaltyLedgerEntry e
      set e.customerId = :survivorId
      where e.customerId = :duplicateId
        and e.tenantId = :tenantId
      """)
  int repointCustomerId(
      @Param("survivorId") UUID survivorId,
      @Param("duplicateId") UUID duplicateId,
      @Param("tenantId") UUID tenantId);

  @Modifying(clearAutomatically = true)
  @Query(
      """
      update CustomerLoyaltyLedgerEntry e
      set e.accountId = :survivorAccountId
      where e.accountId = :duplicateAccountId
        and e.tenantId = :tenantId
      """)
  int repointAccountId(
      @Param("survivorAccountId") UUID survivorAccountId,
      @Param("duplicateAccountId") UUID duplicateAccountId,
      @Param("tenantId") UUID tenantId);
}
