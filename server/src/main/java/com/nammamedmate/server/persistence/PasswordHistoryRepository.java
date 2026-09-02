package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.PasswordHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordHistoryRepository extends JpaRepository<PasswordHistory, UUID> {

  @Query(
      """
      select h from PasswordHistory h
      where h.userId = :userId
        and ((:tenantId is null and h.tenantId is null) or h.tenantId = :tenantId)
      """)
  List<PasswordHistory> findByUserIdAndTenantId(
      @Param("userId") UUID userId, @Param("tenantId") UUID tenantId);
}
