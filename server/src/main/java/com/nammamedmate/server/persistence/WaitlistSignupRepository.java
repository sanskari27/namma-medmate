package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.WaitlistSignup;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WaitlistSignupRepository extends JpaRepository<WaitlistSignup, UUID> {

  List<WaitlistSignup> findAllByOrderByCreatedAtDesc();
}
