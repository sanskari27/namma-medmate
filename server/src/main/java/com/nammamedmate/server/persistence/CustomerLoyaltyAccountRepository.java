package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerLoyaltyAccount;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerLoyaltyAccountRepository
    extends JpaRepository<CustomerLoyaltyAccount, UUID> {

  Optional<CustomerLoyaltyAccount> findByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  List<CustomerLoyaltyAccount> findAllByTenantIdAndCustomerIdIn(
      UUID tenantId, Collection<UUID> customerIds);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select a from CustomerLoyaltyAccount a
      where a.tenantId = :tenantId and a.customerId = :customerId
      """)
  Optional<CustomerLoyaltyAccount> lockByTenantIdAndCustomerId(
      @Param("tenantId") UUID tenantId, @Param("customerId") UUID customerId);
}
