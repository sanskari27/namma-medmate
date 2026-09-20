package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.DpdpRequest;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DpdpRequestRepository extends JpaRepository<DpdpRequest, UUID> {

  List<DpdpRequest> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

  List<DpdpRequest> findByTenantIdIsNullOrderByCreatedAtDesc();

  List<DpdpRequest> findByPrincipalTypeInOrderByCreatedAtDesc(
      java.util.Collection<com.nammamedmate.server.domain.DpdpPrincipalType> types);

  Optional<DpdpRequest> findByIdAndTenantId(UUID id, UUID tenantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from DpdpRequest r where r.id = :id")
  Optional<DpdpRequest> lockById(@Param("id") UUID id);
}
