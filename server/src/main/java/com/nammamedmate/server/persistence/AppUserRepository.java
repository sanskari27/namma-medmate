package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AppUser;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

  Optional<AppUser> findByEmailAndDeletedAtIsNull(String email);

  @Query(
      """
      select u from AppUser u
      where lower(u.email) = :normalizedEmail
        and u.deletedAt is null
      """)
  Optional<AppUser> findByNormalizedEmailAndDeletedAtIsNull(
      @Param("normalizedEmail") String normalizedEmail);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from AppUser u where u.id = :id")
  Optional<AppUser> lockById(@Param("id") UUID id);
}
