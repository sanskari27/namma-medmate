package com.nammamedmate.server.persistence;

import com.nammamedmate.server.domain.HospitalLedgerEntry;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalLedgerEntryRepository extends JpaRepository<HospitalLedgerEntry, UUID> {}
