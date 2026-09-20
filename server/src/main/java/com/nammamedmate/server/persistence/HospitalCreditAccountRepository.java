package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalCreditAccount;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalCreditAccountRepository
    extends JpaRepository<HospitalCreditAccount, UUID> {

  Optional<HospitalCreditAccount> findByTenantId(UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from HospitalCreditAccount a where a.tenantId = :tenantId")
  Optional<HospitalCreditAccount> lockByTenantId(@Param("tenantId") UUID tenantId);

  Optional<HospitalCreditAccount> findByPriceListApprovalRequestIdAndTenantId(
      UUID requestId, UUID tenantId);
}
