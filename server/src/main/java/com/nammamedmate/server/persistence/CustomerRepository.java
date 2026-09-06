package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Customer;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

  Optional<Customer> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);

  Optional<Customer> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<Customer> findByTenantIdAndPhoneAndDeletedAtIsNull(UUID tenantId, String phone);

  List<Customer> findAllByTenantIdAndDeletedAtIsNullOrderByNameAsc(UUID tenantId);

  @Query(
      """
      select c from Customer c
      where c.tenantId = :tenantId
        and c.deletedAt is null
        and c.createdAt >= :from
        and c.createdAt < :toExclusive
      order by c.createdAt asc, c.name asc
      """)
  List<Customer> findCreatedInWindow(
      @Param("tenantId") UUID tenantId,
      @Param("from") Instant from,
      @Param("toExclusive") Instant toExclusive);

  List<Customer> findAllByTenantIdAndIdIn(UUID tenantId, Collection<UUID> ids);

  @Query(
      """
      select c from Customer c
      where c.tenantId = :tenantId
        and c.deletedAt is null
        and (
          lower(c.name) like lower(concat('%', :q, '%'))
          or c.phone like concat('%', :q, '%')
        )
      order by c.name asc
      """)
  List<Customer> searchByTenant(@Param("tenantId") UUID tenantId, @Param("q") String q);
}
