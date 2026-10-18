package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "waitlist_signup")
@Getter
@Setter
public class WaitlistSignup {

  @Id private UUID id;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, length = 10)
  private String phone;

  @Column(nullable = false, length = 6)
  private String pincode;

  @Column(nullable = false)
  private int age;

  @Column(nullable = false, length = 32)
  private String gender;

  @Column(nullable = false)
  private boolean consent;

  @Column(nullable = false, length = 80)
  private String source;

  @Column(nullable = false, length = 16)
  private String lang;

  @Column(nullable = false, length = 64)
  private String offer;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
}
