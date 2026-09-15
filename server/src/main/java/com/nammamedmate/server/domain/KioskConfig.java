package com.nammamedmate.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "kiosk_config")
@IdClass(KioskConfig.KioskConfigId.class)
@Getter
@Setter
public class KioskConfig {

  @Id
  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Id
  @Column(name = "branch_id", nullable = false)
  private UUID branchId;

  @Column(name = "display_name", nullable = false, length = 160)
  private String displayName = "";

  @Column(name = "welcome_message", nullable = false, length = 240)
  private String welcomeMessage = "";

  @Column(name = "staff_exit_pin", nullable = false, length = 100)
  private String staffExitPin = "";

  @Column(name = "idle_reset_seconds", nullable = false)
  private int idleResetSeconds = 60;

  @Column(name = "accent_theme", nullable = false, length = 16)
  private String accentTheme = "green";

  @Column(name = "show_prices", nullable = false)
  private boolean showPrices = true;

  @Column(name = "allow_rx_upload", nullable = false)
  private boolean allowRxUpload = true;

  @Column(name = "accept_cash", nullable = false)
  private boolean acceptCash = true;

  @Column(name = "accept_upi", nullable = false)
  private boolean acceptUpi = true;

  @Column(name = "accept_card", nullable = false)
  private boolean acceptCard = true;

  @Column(name = "accept_cod", nullable = false)
  private boolean acceptCod = false;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Getter
  @Setter
  public static class KioskConfigId implements Serializable {
    private UUID tenantId;
    private UUID branchId;

    public KioskConfigId() {}

    public KioskConfigId(UUID tenantId, UUID branchId) {
      this.tenantId = tenantId;
      this.branchId = branchId;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) {
        return true;
      }
      if (!(o instanceof KioskConfigId that)) {
        return false;
      }
      return Objects.equals(tenantId, that.tenantId) && Objects.equals(branchId, that.branchId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(tenantId, branchId);
    }
  }
}
