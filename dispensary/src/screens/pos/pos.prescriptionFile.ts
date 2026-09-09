/** Holds the Rx file outside Redux (File is not serializable). */
let pendingPrescriptionFile: File | null = null;

export function setPendingPrescriptionFile(file: File | null) {
  pendingPrescriptionFile = file;
}

export function peekPendingPrescriptionFile(): File | null {
  return pendingPrescriptionFile;
}

export function clearPendingPrescriptionFile() {
  pendingPrescriptionFile = null;
}
