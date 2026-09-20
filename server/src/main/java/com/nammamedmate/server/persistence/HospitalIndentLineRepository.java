package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalIndentLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalIndentLineRepository extends JpaRepository<HospitalIndentLine, UUID> {

  List<HospitalIndentLine> findAllByIndentIdOrderBySortOrderAsc(UUID indentId);
}
