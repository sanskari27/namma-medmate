package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.CustomerCreditAccount;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerCreditAccountRepository
    extends JpaRepository<CustomerCreditAccount, UUID> {

  Optional<CustomerCreditAccount> findByTenantIdAndCustomerId(UUID tenantId, UUID customerId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select a from CustomerCreditAccount a
      where a.tenantId = :tenantId and a.customerId = :customerId
      """)
  Optional<CustomerCreditAccount> lockByTenantIdAndCustomerId(
      @Param("tenantId") UUID tenantId, @Param("customerId") UUID customerId);

  List<CustomerCreditAccount> findAllByTenantIdAndBalancePaiseGreaterThanOrderByBalancePaiseDesc(
      UUID tenantId, long balancePaise);

  List<CustomerCreditAccount> findAllByTenantIdAndCustomerIdIn(
      UUID tenantId, List<UUID> customerIds);
}
