package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AppUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

  Optional<AppUser> findByEmailAndDeletedAtIsNull(String email);
}
