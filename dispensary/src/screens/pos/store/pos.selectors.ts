import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  invoiceTotals,
  isControlledProduct,
  isPrescriptionProduct,
  previewTender,
} from '../PosScreen.utils';
import { POS_CONTENT } from '../PosScreen.content';
import { collectiblePaise, parseRedeemPoints } from '@/services/loyalty';

export const selectPos = (state: RootState) => state.pos;

export const selectPosAllowed = (state: RootState) => state.pos.allowed;
export const selectPosStep = (state: RootState) => state.pos.step;
export const selectPosBusy = (state: RootState) => state.pos.busy;
export const selectPosStatus = (state: RootState) => state.pos.status;
export const selectPosStatusHint = (state: RootState) => state.pos.statusHint;
export const selectPosCatalogue = (state: RootState) => state.pos.catalogue;
export const selectPosCategories = (state: RootState) => state.pos.categories;
export const selectPosCategoryFilterId = (state: RootState) => state.pos.categoryFilterId;
export const selectPosProductQuery = (state: RootState) => state.pos.productQuery;
export const selectPosBarcodeQuery = (state: RootState) => state.pos.barcodeQuery;
export const selectPosCustomerQuery = (state: RootState) => state.pos.customerQuery;
export const selectPosDraft = (state: RootState) => state.pos.draft;
export const selectPosInvoice = (state: RootState) => state.pos.invoice;
export const selectPosWalkInName = (state: RootState) => state.pos.walkInName;
export const selectPosWalkInPhone = (state: RootState) => state.pos.walkInPhone;
export const selectPosSelectedCustomer = (state: RootState) => state.pos.selectedCustomer;
export const selectPosWalkIn = (state: RootState) => state.pos.walkIn;
export const selectPosCustomers = (state: RootState) => state.pos.customers;
export const selectPosDoctors = (state: RootState) => state.pos.doctors;
export const selectPosSelectedDoctorId = (state: RootState) => state.pos.selectedDoctorId;
export const selectPosPrescriptionVerified = (state: RootState) => state.pos.prescriptionVerified;
export const selectPosPrescriptionReference = (state: RootState) => state.pos.prescriptionReference;
export const selectPosPrescriptionAttachmentName = (state: RootState) =>
  state.pos.prescriptionAttachmentName;
export const selectPosCanDispense = (state: RootState) => state.pos.canDispense;
export const selectPosCustomerChosen = (state: RootState) =>
  state.pos.walkIn || state.pos.selectedCustomer != null;
export const selectPosCustomerPhone = (state: RootState) =>
  state.pos.selectedCustomer?.phone ?? (state.pos.walkInPhone.trim() || null);
export const selectPosBillType = (state: RootState) => state.pos.billType;
export const selectPosBillValue = (state: RootState) => state.pos.billValue;
export const selectPosPaymentMode = (state: RootState) => state.pos.paymentMode;
export const selectPosTender = (state: RootState) => state.pos.tender;
export const selectPosCollected = (state: RootState) => state.pos.invoice?.status === 'COMPLETED';
export const selectPosTaxProductId = (state: RootState) => state.pos.taxProductId;
export const selectPosTaxRate = (state: RootState) => state.pos.taxRate;
export const selectPosTaxReason = (state: RootState) => state.pos.taxReason;

export const selectPosCartQtyByProductId = createSelector(
  [(state: RootState) => state.pos.draft],
  (draft) => {
    const map = new Map<string, number>();
    for (const line of draft) {
      const qty = Number(line.quantity) || 0;
      const factor =
        line.unitFactors[line.unit] ??
        (line.unit === line.product.baseUnit
          ? 1
          : line.unit === line.product.packUnit
            ? Number(line.product.packSize) || 1
            : 1);
      map.set(line.product.id, (map.get(line.product.id) ?? 0) + qty * factor);
    }
    return map;
  },
);

export const selectPosHasCartItems = (state: RootState) => state.pos.draft.length > 0;

export const selectPosControlledDraft = (state: RootState) =>
  state.pos.draft.some((line) => isControlledProduct(line.product));

export const selectPosPrescriptionDraft = (state: RootState) =>
  state.pos.draft.some((line) => isPrescriptionProduct(line.product));

export const selectPosTotals = (state: RootState) =>
  invoiceTotals(
    state.pos.invoice,
    state.pos.draft.map((line) => ({
      quantity: line.quantity,
      mrpRupees: line.mrpRupees,
      sellingRupees: line.sellingRupees,
      discountRupees: line.discountRupees,
      gstRate: line.product.gstRate,
    })),
  );

export const selectPosTenderPreview = (state: RootState) => {
  const totals = selectPosTotals(state);
  const points = parseRedeemPoints(state.pos.redeemPoints) ?? 0;
  const due = collectiblePaise(state.pos.invoice?.totalPaise ?? totals.totalPaise, points);
  return previewTender(due, state.pos.tender);
};

export const selectPosTaxProductName = (state: RootState) =>
  state.pos.draft.find((line) => line.product.id === state.pos.taxProductId)?.product.name ??
  'this medicine';

export const selectPosEvaluation = (state: RootState) => state.pos.evaluation;
export const selectPosReason = (state: RootState) => state.pos.reason;
export const selectPosOffers = (state: RootState) => state.pos.offers;
export const selectPosOffersLoading = (state: RootState) => state.pos.offersLoading;
export const selectPosCustomerGstin = (state: RootState) => state.pos.customerGstin;
export const selectPosCreditAvailablePaise = (state: RootState) => state.pos.creditAvailablePaise;
export const selectPosLoyaltyEntitled = (state: RootState) => state.pos.loyaltyEntitled;
export const selectPosLoyaltyBalancePoints = (state: RootState) => state.pos.loyaltyBalancePoints;
export const selectPosLoyaltyLoading = (state: RootState) => state.pos.loyaltyLoading;
export const selectPosRedeemPoints = (state: RootState) => state.pos.redeemPoints;
export const selectPosCopyBusy = (state: RootState) => state.pos.copyBusy;
export const selectPosCopyHint = (state: RootState) => state.pos.copyHint;
export const selectPosHeld = (state: RootState) => state.pos.held;
export const selectPosHeldLoading = (state: RootState) => state.pos.heldLoading;
export const selectPosRxFulfillment = (state: RootState) => state.pos.rxFulfillment;
export const selectPosRxFulfillmentLoading = (state: RootState) => state.pos.rxFulfillmentLoading;

export const selectPosCustomerDisplayName = (state: RootState) => {
  if (state.pos.selectedCustomer) {
    return state.pos.selectedCustomer.name;
  }
  if (state.pos.walkIn) {
    return state.pos.walkInName.trim() || POS_CONTENT.walkInLabel;
  }
  return POS_CONTENT.noCustomer;
};
