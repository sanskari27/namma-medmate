package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.UserBranch;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserBranchRepository extends JpaRepository<UserBranch, UUID> {

  List<UserBranch> findAllByTenantIdAndUserIdOrderByCreatedAtAsc(UUID tenantId, UUID userId);

  Optional<UserBranch> findByTenantIdAndUserIdAndBranchId(
      UUID tenantId, UUID userId, UUID branchId);

  boolean existsByTenantIdAndUserIdAndBranchId(UUID tenantId, UUID userId, UUID branchId);

  @Modifying(clearAutomatically = true)
  @Query("delete from UserBranch ub where ub.tenantId = :tenantId and ub.userId = :userId")
  void deleteByTenantIdAndUserId(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

  @Modifying(clearAutomatically = true)
  @Query(
      "delete from UserBranch ub where ub.tenantId = :tenantId and ub.userId = :userId and ub.branchId = :branchId")
  void deleteByTenantIdAndUserIdAndBranchId(
      @Param("tenantId") UUID tenantId,
      @Param("userId") UUID userId,
      @Param("branchId") UUID branchId);
}
