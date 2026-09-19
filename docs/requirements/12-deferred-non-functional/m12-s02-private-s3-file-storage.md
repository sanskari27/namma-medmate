---
id: M12-S02
epic: M12
title: Private S3 file storage
phase: 1
priority: P1
apps: [server]
personas: [OWNER, MASTER]
depends_on: []
blocked_by: []
sources:
  - docs/requirements/DECISIONS.md
  - docs/product/product-compiled.md
---

# M12-S02 — Private S3 file storage

## User story

As **OWNER or MASTER**, I want KYC, licence, expense, and prescription evidence stored in private S3 in Mumbai so that a lost EC2 disk cannot drop those files.

## Scope

### In

- Prod object store is a private ap-south-1 S3 bucket with versioning, SSE-S3, and public access blocked.
- Local and docker keep on-disk storage. The `local` profile rejects a files bucket.
- Existing storage keys and download APIs stay the same. Tenant id remains in the key.
- EC2 instance role may read and write the files bucket. Prod fails fast without a bucket name.

### Out

- Migrating bytes already on the EC2 `./files` bind mount.
- A public download URL. Files still stream through the API.
- DPDP erasure or churn deletion (D-013).
- Changing KYC/licence/expense/prescription HTTP contracts.

## Acceptance criteria

### M12-S02-AC01 — Prod uses private S3 in ap-south-1

| Given | When | Then |
|---|---|---|
| Prod profile is active and `NMM_FILES_BUCKET` is set | OWNER or MASTER stores KYC, licence, expense, or prescription evidence | The object is written to that bucket in ap-south-1 under a namespaced key that starts with the tenant id, not to the EC2 bind mount |

### M12-S02-AC02 — Local keeps disk and cannot target prod S3

| Given | When | Then |
|---|---|---|
| The `local` profile is active | A files bucket name is configured | Startup fails. Local and docker with a blank bucket keep writing under the local storage directory |

### M12-S02-AC03 — Existing keys still open

| Given | When | Then |
|---|---|---|
| A document was stored for a tenant | OWNER or MASTER opens that evidence through the existing API | The same storage key returns the bytes. A missing or traversing key is undisclosed |

### M12-S02-AC04 — Bucket is not public and prod requires it

| Given | When | Then |
|---|---|---|
| Terraform defines the files bucket | An operator inspects the module | Versioning is on, SSE-S3 is on, public ACLs and policies are blocked, and SSM includes `NMM_FILES_BUCKET`. Prod with a blank bucket fails to start |

### M12-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| A key with `..`, a blank key, or another tenant's prefix is requested | Resolve or store runs | The call fails without reading another tenant's object. A store I/O failure does not leave a committed evidence row |

## Implementation contract

- Disk adapter for blank `nmm.storage.s3.bucket`; S3 adapter when the bucket is set.
- Do not add a public bucket policy or website hosting.
- Region is ap-south-1.

## Required tests

- `ObjectStoreTest` disk put/resolve and path-traversal reject.
- `S3ObjectStoreTest` mocked client put uses the configured bucket and key.
- `ProdFilesBucketGuardTest` / `LocalEnvironmentGuardTest` bucket rules.
- `ProdOpsSeedTest` Terraform versioning, encryption, public-access block, SSM key.

## Definition of done

- [ ] Every AC has a named test.
- [ ] Listed server and compose gates pass.
- [ ] Independent verification returns `PASS`.
