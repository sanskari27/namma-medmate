import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { clearPendingPrescriptionFile } from '../pos.prescriptionFile';
import type { Customer } from '@/services/customers';
import type { Doctor } from '@/services/doctors';
import type { ProductCategory } from '@/services/productCategories';
import type { ProductUnit } from '@/services/products';
import type { SafetyEvaluation } from '@/services/medicationSafety';
import type { SalesCatalogueItem } from '@/services/salesCatalogue';
import type { DiscountType, PaymentMode, SalesInvoice } from '@/services/salesInvoices';
import type { PosDraftLine } from '../pos.types';
import { POS_CONTENT } from '../PosScreen.content';
import {
  emptyTender,
  type PageStatus,
  type TenderDraft,
} from '../PosScreen.utils';
import {
  addProduct,
  applyPricing,
  changeLineUnit,
  collectPayment,
  continueInvoice,
  holdBill,
  loadBootstrap,
  loadCustomerCredit,
  saveInvoice,
  scanBarcode,
  searchCatalogue,
  searchCustomers,
} from './pos.thunks';

export type PosStep = 'cart' | 'payment';

export type PosState = {
  status: PageStatus;
  statusHint: string | null;
  busy: boolean;
  allowed: boolean;
  canDispense: boolean;
  loyaltyEntitled: boolean;
  step: PosStep;
  catalogue: SalesCatalogueItem[];
  categories: ProductCategory[];
  categoryFilterId: 'all' | string;
  productQuery: string;
  barcodeQuery: string;
  draft: PosDraftLine[];
  customerQuery: string;
  customers: Customer[];
  selectedCustomer: Customer | null;
  walkIn: boolean;
  walkInName: string;
  walkInPhone: string;
  invoice: SalesInvoice | null;
  billType: DiscountType;
  billValue: string;
  customerGstin: string;
  tender: TenderDraft;
  paymentMode: PaymentMode | null;
  doctors: Doctor[];
  selectedDoctorId: string;
  prescriptionVerified: boolean;
  prescriptionReference: string;
  prescriptionAttachmentName: string;
  taxProductId: string | null;
  taxRate: string;
  taxReason: string;
  creditAvailablePaise: number | null;
  redeemPoints: string;
  evaluation: SafetyEvaluation | null;
  reason: string;
  createKey: string;
  completeKey: string;
};

export const initialPosState: PosState = {
  status: 'loading',
  statusHint: null,
  busy: false,
  allowed: false,
  canDispense: false,
  loyaltyEntitled: false,
  step: 'cart',
  catalogue: [],
  categories: [],
  categoryFilterId: 'all',
  productQuery: '',
  barcodeQuery: '',
  draft: [],
  customerQuery: '',
  customers: [],
  selectedCustomer: null,
  walkIn: false,
  walkInName: '',
  walkInPhone: '',
  invoice: null,
  billType: 'FLAT',
  billValue: '',
  customerGstin: '',
  tender: emptyTender(),
  paymentMode: null,
  doctors: [],
  selectedDoctorId: '',
  prescriptionVerified: false,
  prescriptionReference: '',
  prescriptionAttachmentName: '',
  taxProductId: null,
  taxRate: '',
  taxReason: '',
  creditAvailablePaise: null,
  redeemPoints: '',
  evaluation: null,
  reason: '',
  createKey: crypto.randomUUID(),
  completeKey: crypto.randomUUID(),
};

function patchDraftLine(
  draft: PosDraftLine[],
  lineId: string,
  patch: Partial<PosDraftLine>,
): PosDraftLine[] {
  return draft.map((line) => (line.id === lineId ? { ...line, ...patch } : line));
}

function clearBillFields(state: PosState) {
  state.invoice = null;
  state.draft = [];
  state.selectedCustomer = null;
  state.walkIn = false;
  state.walkInName = '';
  state.walkInPhone = '';
  state.selectedDoctorId = '';
  state.prescriptionVerified = false;
  state.prescriptionReference = '';
  state.prescriptionAttachmentName = '';
  clearPendingPrescriptionFile();
  state.evaluation = null;
  state.reason = '';
  state.billType = 'FLAT';
  state.billValue = '';
  state.customerGstin = '';
  state.taxProductId = null;
  state.taxRate = '';
  state.taxReason = '';
  state.tender = emptyTender();
  state.paymentMode = null;
  state.creditAvailablePaise = null;
  state.redeemPoints = '';
  state.productQuery = '';
  state.barcodeQuery = '';
  state.customerQuery = '';
  state.step = 'cart';
  state.createKey = crypto.randomUUID();
  state.completeKey = crypto.randomUUID();
}

const posSlice = createSlice({
  name: 'pos',
  initialState: initialPosState,
  reducers: {
    accessResolved: (
      state,
      action: PayloadAction<{
        allowed: boolean;
        canDispense: boolean;
        loyaltyEntitled: boolean;
      }>,
    ) => {
      state.allowed = action.payload.allowed;
      state.canDispense = action.payload.canDispense;
      state.loyaltyEntitled = action.payload.loyaltyEntitled;
      if (!action.payload.allowed) {
        state.status = 'denied';
      }
    },
    statusSet: (state, action: PayloadAction<PageStatus>) => {
      state.status = action.payload;
    },
    statusHintSet: (state, action: PayloadAction<string | null>) => {
      state.statusHint = action.payload;
    },
    barcodeQueryChanged: (state, action: PayloadAction<string>) => {
      state.barcodeQuery = action.payload;
    },
    productQueryChanged: (state, action: PayloadAction<string>) => {
      state.productQuery = action.payload;
    },
    categoryFilterChanged: (state, action: PayloadAction<'all' | string>) => {
      state.categoryFilterId = action.payload;
    },
    customerQueryChanged: (state, action: PayloadAction<string>) => {
      state.customerQuery = action.payload;
    },
    walkInNameChanged: (state, action: PayloadAction<string>) => {
      state.walkInName = action.payload;
    },
    walkInPhoneChanged: (state, action: PayloadAction<string>) => {
      state.walkInPhone = action.payload;
    },
    removeProduct: (state, action: PayloadAction<string>) => {
      state.draft = state.draft.filter((line) => line.id !== action.payload);
      state.evaluation = null;
    },
    quantityChanged: (state, action: PayloadAction<{ lineId: string; quantity: string }>) => {
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        quantity: action.payload.quantity,
      });
    },
    batchChanged: (state, action: PayloadAction<{ lineId: string; batchId: string }>) => {
      const source = state.draft.find((line) => line.id === action.payload.lineId);
      if (!source) {
        return;
      }
      const sibling = state.draft.find(
        (line) =>
          line.id !== source.id &&
          line.product.id === source.product.id &&
          line.unit === source.unit &&
          line.batchId === action.payload.batchId,
      );
      if (sibling) {
        const nextQty =
          (Number(sibling.quantity) || 0) + (Number(source.quantity) || 0);
        state.draft = state.draft
          .filter((line) => line.id !== source.id)
          .map((line) =>
            line.id === sibling.id ? { ...line, quantity: String(nextQty) } : line,
          );
        state.evaluation = null;
        return;
      }
      const batch = source.batches.find((item) => item.batchId === action.payload.batchId);
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        batchId: action.payload.batchId,
        nearExpiry: batch?.nearExpiry === true,
      });
    },
    unitChanged: (state, action: PayloadAction<{ lineId: string; unit: ProductUnit }>) => {
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        unit: action.payload.unit,
      });
      state.evaluation = null;
    },
    mrpChanged: (state, action: PayloadAction<{ lineId: string; value: string }>) => {
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        mrpRupees: action.payload.value,
      });
    },
    sellingChanged: (state, action: PayloadAction<{ lineId: string; value: string }>) => {
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        sellingRupees: action.payload.value,
      });
    },
    discountChanged: (state, action: PayloadAction<{ lineId: string; value: string }>) => {
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        discountRupees: action.payload.value,
      });
    },
    discountTypeChanged: (
      state,
      action: PayloadAction<{ lineId: string; value: DiscountType }>,
    ) => {
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        discountType: action.payload.value,
        discountRupees: '',
      });
    },
    billTypeChanged: (state, action: PayloadAction<DiscountType>) => {
      state.billType = action.payload;
    },
    billValueChanged: (state, action: PayloadAction<string>) => {
      state.billValue = action.payload;
    },
    customerGstinChanged: (state, action: PayloadAction<string>) => {
      state.customerGstin = action.payload;
    },
    paymentModeSelected: (state, action: PayloadAction<PaymentMode>) => {
      const mode = action.payload;
      state.paymentMode = mode;
      const totalPaise =
        state.invoice?.totalPaise ??
        state.draft.reduce((sum, line) => {
          const qty = Number(line.quantity);
          const selling = Number(line.sellingRupees);
          if (!Number.isFinite(qty) || !Number.isFinite(selling) || qty <= 0 || selling < 0) {
            return sum;
          }
          return sum + Math.round(qty * selling * 100);
        }, 0);
      const totalRupees = (totalPaise / 100).toFixed(2);
      const blank = emptyTender();
      if (mode === 'CASH') {
        blank.cashRupees = totalRupees;
      } else if (mode === 'UPI') {
        blank.upiRupees = totalRupees;
      } else if (mode === 'CARD') {
        blank.cardRupees = totalRupees;
      } else if (mode === 'CREDIT') {
        blank.creditRupees = totalRupees;
      } else {
        blank.bankRupees = totalRupees;
      }
      state.tender = blank;
    },
    tenderPatched: (state, action: PayloadAction<Partial<TenderDraft>>) => {
      state.tender = { ...state.tender, ...action.payload };
    },
    selectCustomer: (state, action: PayloadAction<Customer>) => {
      state.selectedCustomer = action.payload;
      state.walkIn = false;
      state.walkInName = action.payload.name;
      state.walkInPhone = action.payload.phone ?? '';
      state.evaluation = null;
      state.status = null;
      state.statusHint = null;
    },
    continueAsWalkIn: (state) => {
      state.selectedCustomer = null;
      state.walkIn = true;
      state.walkInName = '';
      state.walkInPhone = '';
      state.creditAvailablePaise = null;
      state.tender = { ...state.tender, creditRupees: '' };
      state.evaluation = null;
      state.status = null;
      state.statusHint = null;
    },
    clearCustomer: (state) => {
      state.selectedCustomer = null;
      state.walkIn = false;
      state.walkInName = '';
      state.walkInPhone = '';
      state.creditAvailablePaise = null;
      state.tender = { ...state.tender, creditRupees: '' };
    },
    doctorsLoaded: (state, action: PayloadAction<Doctor[]>) => {
      state.doctors = action.payload;
    },
    doctorChanged: (state, action: PayloadAction<string>) => {
      state.selectedDoctorId = action.payload;
    },
    prescriptionVerifiedChanged: (state, action: PayloadAction<boolean>) => {
      state.prescriptionVerified = action.payload;
    },
    prescriptionReferenceChanged: (state, action: PayloadAction<string>) => {
      state.prescriptionReference = action.payload;
    },
    prescriptionAttachmentChanged: (state, action: PayloadAction<string>) => {
      state.prescriptionAttachmentName = action.payload;
      if (!action.payload) {
        clearPendingPrescriptionFile();
      }
    },
    prescribedQuantityChanged: (
      state,
      action: PayloadAction<{ lineId: string; value: string }>,
    ) => {
      state.draft = patchDraftLine(state.draft, action.payload.lineId, {
        prescribedQuantity: action.payload.value,
      });
    },
    reasonChanged: (state, action: PayloadAction<string>) => {
      state.reason = action.payload;
    },
    redeemPointsChanged: (state, action: PayloadAction<string>) => {
      state.redeemPoints = action.payload;
    },
    openTaxOverride: (state, action: PayloadAction<string>) => {
      const line = state.draft.find((item) => item.product.id === action.payload);
      state.taxProductId = action.payload;
      state.taxRate = String(
        line?.product.gstRate ??
          state.invoice?.lines.find((row) => row.productId === action.payload)?.gstRate ??
          '',
      );
      state.taxReason = '';
    },
    closeTaxOverride: (state) => {
      state.taxProductId = null;
    },
    taxRateChanged: (state, action: PayloadAction<string>) => {
      state.taxRate = action.payload;
    },
    taxReasonChanged: (state, action: PayloadAction<string>) => {
      state.taxReason = action.payload;
    },
    proceedToPayment: (state) => {
      state.step = 'payment';
    },
    backToCart: (state) => {
      state.step = 'cart';
    },
    clearBill: (state) => {
      clearBillFields(state);
      state.status = state.catalogue.length === 0 ? 'empty' : null;
      state.statusHint = null;
    },
    newSale: (state) => {
      clearBillFields(state);
      state.status = null;
      state.statusHint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadBootstrap.pending, (state) => {
        if (state.allowed) {
          state.status = 'loading';
          state.statusHint = null;
        }
      })
      .addCase(loadBootstrap.fulfilled, (state, action) => {
        state.catalogue = action.payload.catalogue;
        state.categories = action.payload.categories;
        state.customers = action.payload.customers;
        state.doctors = action.payload.doctors;
        if (!state.invoice) {
          state.status = action.payload.catalogue.length === 0 ? 'empty' : null;
        }
      })
      .addCase(loadBootstrap.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(searchCatalogue.fulfilled, (state, action) => {
        state.catalogue = action.payload;
        if (state.status === 'empty' && action.payload.length > 0) {
          state.status = null;
        }
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.customers = action.payload;
      })
      .addCase(scanBarcode.fulfilled, (state, action) => {
        if (action.payload.matched) {
          state.barcodeQuery = '';
        }
      })
      .addCase(addProduct.pending, (state) => {
        state.busy = true;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.busy = false;
        const payload = action.payload;
        if (!payload) {
          return;
        }
        if ('increment' in payload && payload.increment) {
          const existing = state.draft.find((line) => line.id === payload.lineId);
          if (existing) {
            state.draft = patchDraftLine(state.draft, existing.id, {
              quantity: String(Number(existing.quantity || '0') + 1),
            });
          }
          return;
        }
        if (!('product' in payload)) {
          return;
        }
        state.draft.push(payload);
        state.evaluation = null;
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(changeLineUnit.fulfilled, (state, action) => {
        const { lineId, unit, mrpRupees, sellingRupees, baseQuantity, mergeIntoLineId } =
          action.payload;
        if (mergeIntoLineId) {
          const source = state.draft.find((line) => line.id === lineId);
          const target = state.draft.find((line) => line.id === mergeIntoLineId);
          if (source && target) {
            const nextQty = (Number(target.quantity) || 0) + (Number(source.quantity) || 0);
            state.draft = state.draft
              .filter((line) => line.id !== lineId)
              .map((line) =>
                line.id === mergeIntoLineId ? { ...line, quantity: String(nextQty) } : line,
              );
            state.evaluation = null;
            return;
          }
        }
        state.draft = patchDraftLine(state.draft, lineId, {
          unit,
          mrpRupees,
          sellingRupees,
          baseQuantity,
        });
        state.evaluation = null;
      })
      .addCase(changeLineUnit.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(saveInvoice.pending, (state) => {
        state.busy = true;
      })
      .addCase(saveInvoice.fulfilled, (state, action) => {
        state.busy = false;
        state.invoice = action.payload.invoice;
        if (action.payload.advanceToPayment) {
          state.step = 'payment';
        }
        state.status = 'success';
        state.statusHint = null;
      })
      .addCase(saveInvoice.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(applyPricing.pending, (state) => {
        state.busy = true;
      })
      .addCase(applyPricing.fulfilled, (state, action) => {
        state.busy = false;
        state.invoice = action.payload;
        state.status = 'success';
      })
      .addCase(applyPricing.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(collectPayment.pending, (state) => {
        state.busy = true;
      })
      .addCase(collectPayment.fulfilled, (state, action) => {
        state.busy = false;
        state.invoice = action.payload;
        state.status = 'success';
        state.statusHint = POS_CONTENT.thunk.collected(action.payload.invoiceNumber);
        state.completeKey = crypto.randomUUID();
      })
      .addCase(collectPayment.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(holdBill.pending, (state) => {
        state.busy = true;
      })
      .addCase(holdBill.fulfilled, (state, action) => {
        state.busy = false;
        clearBillFields(state);
        state.status = 'success';
        state.statusHint = POS_CONTENT.thunk.held(action.payload.invoiceNumber);
      })
      .addCase(holdBill.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(continueInvoice.pending, (state) => {
        state.busy = true;
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(continueInvoice.fulfilled, (state, action) => {
        state.busy = false;
        clearBillFields(state);
        state.invoice = action.payload.invoice;
        state.draft = action.payload.draft;
        state.selectedCustomer = action.payload.customer;
        state.walkIn = action.payload.walkIn;
        state.doctors = action.payload.doctors;
        state.selectedDoctorId = action.payload.invoice.doctorId ?? '';
        state.prescriptionVerified = action.payload.invoice.prescriptionVerified;
        state.prescriptionReference = action.payload.invoice.prescriptionReference ?? '';
        state.customerGstin = action.payload.invoice.customerGstin ?? '';
        state.billType = action.payload.billType === 'PERCENT' ? 'PERCENT' : 'FLAT';
        state.billValue = action.payload.billValue;
        state.step = 'cart';
        state.status = 'success';
        state.statusHint = action.payload.statusHint;
        state.createKey = crypto.randomUUID();
        state.completeKey = crypto.randomUUID();
      })
      .addCase(continueInvoice.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? POS_CONTENT.resume.failure;
      })
      .addCase(loadCustomerCredit.fulfilled, (state, action) => {
        state.creditAvailablePaise = action.payload;
      });
  },
});

export const {
  accessResolved,
  statusSet,
  statusHintSet,
  barcodeQueryChanged,
  productQueryChanged,
  categoryFilterChanged,
  customerQueryChanged,
  walkInNameChanged,
  walkInPhoneChanged,
  removeProduct,
  quantityChanged,
  batchChanged,
  unitChanged,
  mrpChanged,
  sellingChanged,
  discountChanged,
  discountTypeChanged,
  billTypeChanged,
  billValueChanged,
  customerGstinChanged,
  paymentModeSelected,
  tenderPatched,
  selectCustomer,
  continueAsWalkIn,
  clearCustomer,
  doctorsLoaded,
  doctorChanged,
  prescriptionVerifiedChanged,
  prescriptionReferenceChanged,
  prescriptionAttachmentChanged,
  prescribedQuantityChanged,
  reasonChanged,
  redeemPointsChanged,
  openTaxOverride,
  closeTaxOverride,
  taxRateChanged,
  taxReasonChanged,
  proceedToPayment,
  backToCart,
  clearBill,
  newSale,
} = posSlice.actions;

export const posReducer = posSlice.reducer;
