package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.StaffRegistration;
import com.nammamedmate.server.domain.StaffRegistrationStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StaffRegistrationRepository extends JpaRepository<StaffRegistration, UUID> {

  Optional<StaffRegistration> findByUserId(UUID userId);

  List<StaffRegistration> findByUserIdIn(Collection<UUID> userIds);

  List<StaffRegistration> findByStatusOrderByCreatedAtAsc(StaffRegistrationStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from StaffRegistration r where r.id = :id")
  Optional<StaffRegistration> lockById(@Param("id") UUID id);
}
