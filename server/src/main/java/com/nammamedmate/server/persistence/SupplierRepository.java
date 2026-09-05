package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.Supplier;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

  Optional<Supplier> findByIdAndTenantId(UUID id, UUID tenantId);

  Optional<Supplier> findByTenantIdAndSupplierCode(UUID tenantId, String supplierCode);

  Optional<Supplier> findByTenantIdAndGstin(UUID tenantId, String gstin);

  List<Supplier> findAllByTenantIdOrderByLegalNameAsc(UUID tenantId);

  @Query(
      """
      select s from Supplier s
      where s.tenantId = :tenantId
        and (
          lower(s.legalName) like lower(concat('%', :q, '%'))
          or lower(s.supplierCode) like lower(concat('%', :q, '%'))
          or (s.tradeName is not null and lower(s.tradeName) like lower(concat('%', :q, '%')))
          or (s.gstin is not null and lower(s.gstin) like lower(concat('%', :q, '%')))
          or lower(s.phone) like lower(concat('%', :q, '%'))
        )
      order by s.legalName asc
      """)
  List<Supplier> searchByTenant(@Param("tenantId") UUID tenantId, @Param("q") String q);
}
