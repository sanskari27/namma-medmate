package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalBed;
import com.nammamedmate.server.domain.HospitalBedOccupancy;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HospitalBedRepository extends JpaRepository<HospitalBed, UUID> {

  List<HospitalBed> findAllByTenantIdAndBranchIdAndWardIdOrderBySequenceNoAsc(
      UUID tenantId, UUID branchId, UUID wardId);

  List<HospitalBed> findAllByTenantIdAndBranchIdOrderByWardIdAscSequenceNoAsc(
      UUID tenantId, UUID branchId);

  Optional<HospitalBed> findByIdAndTenantIdAndBranchId(UUID id, UUID tenantId, UUID branchId);

  long countByTenantIdAndBranchIdAndOccupancyStatus(
      UUID tenantId, UUID branchId, HospitalBedOccupancy occupancyStatus);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      """
      update HospitalBed b
      set b.occupancyStatus = com.nammamedmate.server.domain.HospitalBedOccupancy.OCCUPIED,
          b.version = b.version + 1,
          b.updatedAt = :now
      where b.id = :bedId
        and b.tenantId = :tenantId
        and b.branchId = :branchId
        and b.occupancyStatus = com.nammamedmate.server.domain.HospitalBedOccupancy.FREE
      """)
  int occupyIfFree(
      @Param("bedId") UUID bedId,
      @Param("tenantId") UUID tenantId,
      @Param("branchId") UUID branchId,
      @Param("now") java.time.Instant now);
}
