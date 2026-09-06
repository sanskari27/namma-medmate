package com.nammamedmate.server.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nammamedmate.server.shared.exception.ApiException;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WhatsAppMessagePolicyTest {

  @Test
  void ac01_channelIsWhatsAppOnlyAndSmsIsRejected() {
    assertThat(WhatsAppMessagePolicy.CHANNEL).isEqualTo("WHATSAPP");
    WhatsAppMessagePolicy.rejectSms("WHATSAPP");
    assertThatThrownBy(() -> WhatsAppMessagePolicy.rejectSms("SMS"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("SMS_NOT_SUPPORTED");
  }

  @Test
  void ac02_sendableTemplatesAreRefillCreditAndCampaignOnly() {
    WhatsAppMessagePolicy.requireSendableTemplate("refill_due");
    WhatsAppMessagePolicy.requireSendableTemplate("credit_due");
    WhatsAppMessagePolicy.requireSendableTemplate("campaign");
    assertThatThrownBy(() -> WhatsAppMessagePolicy.requireSendableTemplate("birthday"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppMessagePolicy.UNAPPROVED_TEMPLATE);
    assertThatThrownBy(() -> WhatsAppMessagePolicy.requireSendableTemplate("refill_due_warm"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppMessagePolicy.UNAPPROVED_TEMPLATE);
  }

  @Test
  void ac04_draftCampaignIsNotReady() {
    WhatsAppMessagePolicy.requireReady(CampaignStatus.READY_FOR_DELIVERY);
    assertThatThrownBy(() -> WhatsAppMessagePolicy.requireReady(CampaignStatus.DRAFT))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppMessagePolicy.NOT_READY);
  }

  @Test
  void ac06_invalidPhoneIsExplicit() {
    assertThatThrownBy(() -> WhatsAppMessagePolicy.requirePhone("abc"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppMessagePolicy.INVALID_PHONE);
    assertThatThrownBy(() -> WhatsAppMessagePolicy.requirePhone(""))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppMessagePolicy.INVALID_PHONE);
    assertThat(WhatsAppMessagePolicy.requirePhone("9876500001")).isEqualTo("9876500001");
    assertThat(WhatsAppMessagePolicy.requirePhone("+91 98765 00001")).isEqualTo("9876500001");
    assertThat(WhatsAppMessagePolicy.graphAddress("9876500001")).isEqualTo("919876500001");
  }

  @Test
  void ac05_idempotencyKeysAreStable() {
    UUID schedule = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    UUID account = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    UUID campaign = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");
    UUID customer = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd");
    LocalDate day = LocalDate.parse("2026-09-06");
    assertThat(WhatsAppMessagePolicy.refillKey(schedule, day))
        .isEqualTo("refill:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:2026-09-06");
    assertThat(WhatsAppMessagePolicy.creditKey(account, day))
        .isEqualTo("credit:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb:2026-09-06");
    assertThat(WhatsAppMessagePolicy.campaignKey(campaign, customer))
        .isEqualTo(
            "campaign:cccccccc-cccc-cccc-cccc-cccccccccccc:dddddddd-dddd-dddd-dddd-dddddddddddd");
  }

  @Test
  void ac06_unapprovedTemplateWithoutOverlay() {
    assertThatThrownBy(
            () -> WhatsAppMessagePolicy.requireApproved(WhatsAppApprovalStatus.APPROVED, false))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo(WhatsAppMessagePolicy.UNAPPROVED_TEMPLATE);
    WhatsAppMessagePolicy.requireApproved(WhatsAppApprovalStatus.APPROVED, true);
  }
}
