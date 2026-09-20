package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "hospital_uhid_sequence")
@Getter
@Setter
public class HospitalUhidSequence {

  @Id
  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "next_value", nullable = false)
  private int nextValue;
}
