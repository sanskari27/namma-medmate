import { openSecret } from '@namma-medmate/encryption-utils';
import type { EmployeeDocumentRecord, EmployeeRecord } from '@namma-medmate/db-services';
import type { StorageClient } from '@namma-medmate/storage-client';

export function isPharmacistEligible(row: EmployeeRecord): boolean {
  return row.status === 'active' && Boolean(row.pharmacistRegistrationNo);
}

export function maskAadhaar(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replaceAll(/\D/g, '');
  if (digits.length < 4) {
    return 'XXXX-XXXX-XXXX';
  }
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function decryptOptional(ciphertext: string | null, key: string): string | null {
  if (!ciphertext) {
    return null;
  }
  return openSecret(ciphertext, key);
}

export function toListItem(
  row: EmployeeRecord,
  storage: StorageClient,
  bucket: string,
  piiKey: string,
) {
  const aadhaar = decryptOptional(row.aadhaarCiphertext, piiKey);
  return {
    employee_id: row.employeeId,
    employee_code: row.employeeCode,
    full_name: row.fullName,
    phone: row.phone,
    position: row.position,
    position_label: row.positionLabel,
    status: row.status,
    join_date: row.joinDate,
    user_id: row.userId,
    pharmacist_eligible: isPharmacistEligible(row),
    photo_url: row.photoObjectKey
      ? (storage.signedGetUrl(bucket, row.photoObjectKey, 600) ?? null)
      : null,
    aadhaar_masked: maskAadhaar(aadhaar),
  };
}

export function toDocument(row: EmployeeDocumentRecord, storage: StorageClient, bucket: string) {
  return {
    document_id: row.documentId,
    type: row.type,
    object_key: row.objectKey,
    file_name: row.fileName,
    uploaded_at: row.uploadedAt.toISOString(),
    download_url: storage.signedGetUrl(bucket, row.objectKey, 600) ?? null,
  };
}

export function toDetail(
  row: EmployeeRecord,
  documents: EmployeeDocumentRecord[],
  storage: StorageClient,
  bucket: string,
  piiKey: string,
) {
  return {
    ...toListItem(row, storage, bucket, piiKey),
    email: row.email,
    date_of_birth: row.dateOfBirth,
    gender: row.gender,
    address: row.address,
    pan: decryptOptional(row.panCiphertext, piiKey),
    aadhaar: decryptOptional(row.aadhaarCiphertext, piiKey),
    pharmacist_registration_no: row.pharmacistRegistrationNo,
    pharmacist_registration_expiry: row.pharmacistRegistrationExpiry,
    bank_account_holder: row.bankAccountHolder,
    bank_account_number: decryptOptional(row.bankAccountNumberCiphertext, piiKey),
    bank_ifsc: row.bankIfsc,
    bank_upi_id: row.bankUpiId,
    emergency_name: row.emergencyName,
    emergency_phone: row.emergencyPhone,
    emergency_relation: row.emergencyRelation,
    documents: documents.map((item) => toDocument(item, storage, bucket)),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
