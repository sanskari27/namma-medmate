package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.KycSubmission;
import com.nammamedmate.server.domain.KycSubmissionStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KycSubmissionRepository extends JpaRepository<KycSubmission, UUID> {

  Optional<KycSubmission> findByTenantIdAndStatus(UUID tenantId, KycSubmissionStatus status);

  Optional<KycSubmission> findFirstByTenantIdOrderBySubmittedAtDesc(UUID tenantId);

  List<KycSubmission> findByStatusOrderBySubmittedAtAsc(KycSubmissionStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from KycSubmission s where s.id = :id")
  Optional<KycSubmission> lockById(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from KycSubmission s where s.tenantId = :tenantId and s.status = :status")
  Optional<KycSubmission> lockByTenantIdAndStatus(
      @Param("tenantId") UUID tenantId, @Param("status") KycSubmissionStatus status);
}
