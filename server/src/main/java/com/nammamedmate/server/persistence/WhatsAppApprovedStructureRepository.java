package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.WhatsAppApprovedStructure;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WhatsAppApprovedStructureRepository
    extends JpaRepository<WhatsAppApprovedStructure, UUID> {

  Optional<WhatsAppApprovedStructure> findByUniqueName(String uniqueName);

  List<WhatsAppApprovedStructure> findAllByOrderByUniqueNameAsc();
}
