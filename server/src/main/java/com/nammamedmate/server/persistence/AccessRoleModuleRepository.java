package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.AccessRoleModule;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface AccessRoleModuleRepository extends JpaRepository<AccessRoleModule, UUID> {

  List<AccessRoleModule> findByRoleId(UUID roleId);

  List<AccessRoleModule> findByRoleIdIn(Collection<UUID> roleIds);

  @Modifying
  @Transactional
  void deleteByRoleId(UUID roleId);
}
