import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type SafetyCheckStatus = 'CHECKED' | 'INCOMPLETE' | 'NOT_CHECKED';

export type SafetyWarningKind = 'ALLERGY' | 'DUPLICATE_COMPOSITION';

export interface SafetyWarning {
  warningKey: string;
  kind: SafetyWarningKind;
  customerId: string | null;
  productId: string | null;
  productIds: string[];
  matchedAllergen: string | null;
  matchedComposition: string | null;
  matchedField: string | null;
  severity: string;
  requiredAction: string;
  requiredReview: boolean;
}

export interface SafetyEvaluation {
  checkStatus: SafetyCheckStatus;
  checkLabel: string | null;
  productsChecked: number;
  warnings: SafetyWarning[];
}

export interface SafetyAcknowledgeResult {
  acknowledged: boolean;
  acknowledgedAt: string;
}

export interface SafetyClearedResult {
  cleared: boolean;
}

export async function evaluateMedicationSafety(
  customerId: string | null,
  productIds: string[],
): Promise<SafetyEvaluation> {
  const { data } = await apiClient.post<SafetyEvaluation>(API.MEDICATION_SAFETY_EVALUATE, {
    customerId,
    productIds,
  });
  return data;
}

export async function acknowledgeMedicationSafety(input: {
  customerId: string;
  productIds: string[];
  warningKeys: string[];
  reason: string;
}): Promise<SafetyAcknowledgeResult> {
  const { data } = await apiClient.post<SafetyAcknowledgeResult>(
    API.MEDICATION_SAFETY_ACKNOWLEDGE,
    input,
  );
  return data;
}

export async function assertMedicationSafetyCleared(input: {
  customerId: string | null;
  productIds: string[];
  warningKeys: string[];
  reason: string | null;
}): Promise<SafetyClearedResult> {
  const { data } = await apiClient.post<SafetyClearedResult>(
    API.MEDICATION_SAFETY_ASSERT_CLEARED,
    input,
  );
  return data;
}
