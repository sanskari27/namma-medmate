package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AccessRoleEvent;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessRoleEventRepository extends JpaRepository<AccessRoleEvent, UUID> {}
