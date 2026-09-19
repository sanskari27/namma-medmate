package com.nammamedmate.server;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class ProdOpsSeedTest {

  @Test
  void ssmSeedIncludesMetaWhatsAppKeys_M10_WA_003() throws Exception {
    Path root = repoRoot();
    String seed = Files.readString(root.resolve("infra/terraform/modules/platform/main.tf"));
    String example = Files.readString(root.resolve(".env.prod.example"));
    String vars = Files.readString(root.resolve("infra/terraform/modules/platform/variables.tf"));

    assertThat(vars)
        .contains("variable \"meta_whatsapp_token\"")
        .contains("variable \"meta_whatsapp_phone_number_id\"")
        .contains("variable \"meta_whatsapp_waba_id\"")
        .contains("variable \"meta_whatsapp_display_number\"");
    assertThat(seed)
        .contains("META_WHATSAPP_TOKEN=${var.meta_whatsapp_token}")
        .contains("META_WHATSAPP_PHONE_NUMBER_ID=${var.meta_whatsapp_phone_number_id}")
        .contains("META_WHATSAPP_WABA_ID=${var.meta_whatsapp_waba_id}")
        .contains("META_WHATSAPP_DISPLAY_NUMBER=${var.meta_whatsapp_display_number}");
    assertThat(example)
        .contains("META_WHATSAPP_TOKEN=")
        .contains("META_WHATSAPP_PHONE_NUMBER_ID=")
        .contains("META_WHATSAPP_WABA_ID=")
        .contains("META_WHATSAPP_DISPLAY_NUMBER=");
  }

  @Test
  void prodRdsKeepsFinalSnapshotAndDeletionProtection_TF_SNAPSHOT() throws Exception {
    Path root = repoRoot();
    String module = Files.readString(root.resolve("infra/terraform/modules/platform/main.tf"));
    String envVars = Files.readString(root.resolve("infra/terraform/envs/prod/variables.tf"));
    String example =
        Files.readString(root.resolve("infra/terraform/envs/prod/terraform.tfvars.example"));
    String moduleVars =
        Files.readString(root.resolve("infra/terraform/modules/platform/variables.tf"));

    assertThat(envVars).contains("variable \"skip_final_snapshot\"").contains("default = false");
    assertThat(moduleVars).contains("variable \"skip_final_snapshot\"").contains("default = false");
    assertThat(example).contains("skip_final_snapshot   = false");
    assertThat(module).contains("deletion_protection").contains("= true");
    assertThat(module).contains("skip_final_snapshot").contains("var.skip_final_snapshot");
  }

  @Test
  void sshExampleIsHostSlash32NotWorldOpen_TF_SSH_EXAMPLE() throws Exception {
    Path root = repoRoot();
    String example =
        Files.readString(root.resolve("infra/terraform/envs/prod/terraform.tfvars.example"));

    assertThat(example).doesNotContain("0.0.0.0/0");
    assertThat(example).contains("/32");
  }

  @Test
  void filesBucketIsPrivateVersionedS3_M12_S02() throws Exception {
    Path root = repoRoot();
    String module = Files.readString(root.resolve("infra/terraform/modules/platform/main.tf"));
    String example = Files.readString(root.resolve(".env.prod.example"));
    String compose = Files.readString(root.resolve("compose.prod.yaml"));

    assertThat(module).contains("aws_s3_bucket\" \"files\"");
    assertThat(module).contains("aws_s3_bucket_versioning\" \"files\"");
    assertThat(module).contains("aws_s3_bucket_server_side_encryption_configuration\" \"files\"");
    assertThat(module).contains("sse_algorithm = \"AES256\"");
    assertThat(module).contains("aws_s3_bucket_public_access_block\" \"files\"");
    assertThat(module).contains("NMM_FILES_BUCKET=");
    assertThat(module).contains("NMM_FILES_REGION=");
    assertThat(module).contains("s3:PutObject");
    assertThat(module).contains("http_put_response_hop_limit");
    assertThat(example).contains("NMM_FILES_BUCKET=");
    assertThat(example).contains("NMM_FILES_REGION=ap-south-1");
    assertThat(compose).contains("NMM_FILES_BUCKET");
    assertThat(compose).doesNotContain("./files:/app/files");
  }

  private static Path repoRoot() {
    Path cwd = Path.of("").toAbsolutePath().normalize();
    if (cwd.endsWith("server")) {
      return cwd.getParent();
    }
    return cwd;
  }
}
