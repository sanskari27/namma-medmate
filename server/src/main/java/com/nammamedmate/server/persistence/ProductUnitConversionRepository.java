package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.ProductUnit;
import com.nammamedmate.server.domain.ProductUnitConversion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductUnitConversionRepository
    extends JpaRepository<ProductUnitConversion, UUID> {

  List<ProductUnitConversion> findAllByTenantIdAndProductIdOrderByUnitAsc(
      UUID tenantId, UUID productId);

  Optional<ProductUnitConversion> findByTenantIdAndProductIdAndUnit(
      UUID tenantId, UUID productId, ProductUnit unit);

  void deleteByTenantIdAndProductId(UUID tenantId, UUID productId);
}
