import type { PaymentMode } from '@/services/salesInvoices';
import type { PageStatus } from './pos.types';

/** User-facing Sales POS copy. Keep strings here — not inline in JSX or thunks. */
export const POS_CONTENT = {
  regionLabel: 'Sales billing',
  saleSource: {
    aria: 'Sale source',
    counter: 'Counter',
    opdRx: 'OPD Rx',
    ward: 'Ward',
    emergency: 'Emergency',
    uhid: 'UHID',
    wardSelect: 'Ward',
    wardPlaceholder: 'Select ward',
    doctor: 'Prescribing doctor',
    doctorPlaceholder: 'Select hospital doctor',
    needUhid: 'Enter UHID before billing this ward or emergency sale.',
    needWard: 'Pick a ward with UHID before billing this ward sale.',
    denied:
      'This counter cannot bill Ward, Emergency, or OPD Rx. Use Counter, or sign in with Hospital access.',
    discharged: 'This admission is discharged. Bill on Counter, or pick an active ward stay.',
  },
  stepsNav: 'Billing steps',
  stepCart: 'Cart & customer',
  stepPayment: 'Payment',
  stepArrow: '→',
  backToCart: '← Back to add items',

  barcodePlaceholder: 'Scan barcode / type batch no. + Enter',
  barcodeAria: 'Scan barcode or batch number',
  addBarcode: 'Add',
  searchPlaceholder: 'Search medicine, salt, brand…',
  searchAria: 'Search medicine, salt, or brand',

  categoriesAria: 'Product categories',
  categoryAll: 'All',

  catalogueAria: 'Sales catalogue',
  catalogueEmpty: 'No medicines match this search or category.',
  scheduleOtc: 'OTC',
  schedulePrefix: 'Sch.',
  stockInStock: 'in stock',
  stockLow: 'low',
  billBaseQty: (qty: number, unit: string) => `bill ${qty} ${unit}`,
  addPackAria: (name: string) => `Add ${name} pack to bill`,
  addLooseAria: (name: string, unit: string) => `Add ${name} loose ${unit}`,
  looseLabel: (price: string | null, unit: string) =>
    price ? `Loose · ${price} / ${unit}` : `Loose · ${unit}`,

  cartAria: 'Current bill',
  cartTitle: 'Current bill',
  cartClear: 'Clear',
  cartEmpty:
    'Scan or tap a medicine to start billing. Use Loose for tablets/capsules, or pack for a full strip/box.',
  removeLineAria: (name: string, unit: string) => `Remove ${name} (${unit})`,
  unitAria: (name: string) => `Unit for ${name}`,
  batchAria: (name: string, unit: string) => `Batch for ${name} (${unit})`,
  batchSelect: 'Select batch',
  batchFefo: 'FEFO suggested',
  batchNearExpiry: 'near expiry',
  batchNearExpiryBanner: 'Near expiry — still sellable.',
  qtyAria: (name: string, unit: string) => `Quantity for ${name} (${unit})`,
  unitLooseSuffix: ' (loose)',
  unitPackSuffix: ' (pack)',
  unitEach: (baseEach: number, baseUnit: string) => ` · ${baseEach} ${baseUnit} each`,
  ratePerUnit: (price: string, unit: string) => `${price} / ${unit}`,
  lineMrp: 'MRP ₹',
  lineSelling: 'Selling ₹',
  lineDiscountFlat: 'Discount ₹',
  lineDiscountPercent: 'Discount %',
  percentDiscountAria: (name: string) => `Use percent discount for ${name}`,
  flatDiscountAria: (name: string) => `Use rupee discount for ${name}`,

  selectCustomer: 'Select customer',
  changeCustomer: 'Change',
  walkInSale: 'Walk-in sale',
  walkInLabel: 'Walk-in',
  noCustomer: 'No customer',
  noPhone: 'No phone',
  proceed: 'Proceed to bill',

  customerDialogTitle: 'Select customer',
  customerDialogDescription:
    'Search by name or phone, create a new patient, or continue as walk-in.',
  customerSearch: 'Search',
  customerSearchPlaceholder: 'Name or phone',
  customerListAria: 'Customers',
  customerEmpty: 'No customers match this search.',
  createCustomer: 'Create customer',
  continueWalkIn: 'Continue as walk-in',

  rxAria: 'Prescription details',
  rxTitle: 'Prescription required',
  rxHelp: 'Confirm Rx, capture the reference, and record the prescribing doctor. Upload is optional.',
  rxVerified: 'Prescription checked',
  rxReference: 'Rx reference',
  rxReferencePlaceholder: 'Rx number or note',
  rxUploadAria: 'Upload prescription',
  rxPrescribed: (name: string) => `Prescribed qty for ${name}`,
  rxChecking: 'Checking this Rx…',
  rxEmptyFills: 'No fills on this Rx yet.',
  rxRemaining: (qty: number) => `Still on this Rx ${qty}`,
  rxForeign: 'That Rx reference is already on another patient.',
  rxArchived: 'This Rx is archived — history only, not a new sale.',
  rxCheckFailure: 'Could not check this Rx. Check the connection and try again.',
  rxDoctor: 'Prescribing doctor',
  rxDoctorSelect: 'Select doctor',
  rxAddDoctor: 'Add doctor',
  rxPharmacist: 'Call a pharmacist to this till for Schedule H, H1, X, or NDPS.',

  orderSummaryAria: 'Order summary',
  orderSummaryTitle: 'Order summary',
  orderEdit: 'Edit',
  orderCustomer: 'Customer ·',
  orderItem: 'Item',
  orderBatch: 'Batch',
  orderQty: 'Qty',
  orderRate: 'Rate',
  orderAmount: 'Amount',
  orderBatchEmpty: '—',
  lineNameWithUnit: (name: string, unit: string) => `${name} (${unit})`,

  paymentAria: 'Take payment',
  paymentTitle: 'Bill & payment',
  tender: {
    cash: 'Cash ₹',
    card: 'Card ₹',
    upi: 'UPI ₹',
    credit: 'Khata ₹',
    bank: 'Bank ₹',
    cardReference: 'Card reference',
    upiReference: 'UPI reference',
    bankReference: 'Bank reference',
    insurance: 'Insurance / TPA ₹',
    insurer: 'Insurer name',
    policy: 'Policy number',
    empty: 'Add cash, UPI, card, bank, khata, or insurance / TPA to collect.',
    change: 'Change back',
    due: 'Still due',
  },
  held: {
    panelAria: 'Held bills',
    loading: 'Loading held bills…',
    empty: 'No held bills on this till.',
    resume: (invoiceNumber: string) => `Resume bill ${invoiceNumber}`,
  },
  subtotal: 'Subtotal',
  discount: 'Discount',
  billDiscountAria: 'Bill discount',
  discountTypeAria: 'Discount type',
  discountFlat: '₹',
  discountPercent: '%',
  taxable: 'Taxable',
  cgst: 'CGST',
  sgst: 'SGST',
  toPay: 'To pay',
  paymentMethodAria: 'Payment method',
  charge: (amount: string) => `Charge ${amount} & invoice`,
  hold: 'Send to reception · pay later',
  khataLeft: (amount: string) => `Khata left ${amount}`,
  gst: {
    panelAria: 'GST on this bill',
    igst: 'IGST',
    gstin: 'Customer GSTIN',
    apply: 'Apply GST on this bill',
    override: 'Tax override',
    rate: 'GST rate %',
    reason: 'Override reason',
    save: 'Save tax override',
    needReason: 'Tax override needs a reason',
    close: 'Close tax override',
  },
  loyalty: {
    panelAria: 'Points',
    loading: 'Loading points…',
    empty: 'No points on this patient yet.',
    use: 'Use points',
    loadFailure: 'Could not load points for this patient. Try again.',
    balance: (points: number) => `${points} pts`,
  },
  copy: {
    panelAria: 'Bill copy',
    print: 'Print this bill',
    send: 'Send bill copy',
    newSale: 'New sale',
  },

  paymentModes: {
    CASH: 'Cash',
    UPI: 'UPI',
    CARD: 'Card',
    CREDIT: 'Credit (Khata)',
    BANK_TRANSFER: 'Bank',
    INSURANCE_TPA: 'Insurance / TPA',
  } satisfies Record<PaymentMode, string>,

  offlineTitle: 'Sales is offline',
  offlineBody: 'Keep this bill. Collect when the counter is back on the line.',
  offlineOutletLabel: 'This outlet',
  offlineOutletError: 'Could not switch outlet. Try again.',

  status: {
    loading: 'Loading sales catalogue…',
    empty: 'No medicines in the catalogue yet. Add stock in Inventory, then build a draft here.',
    validation:
      'Add a medicine with MRP and selling price. Walk-in can skip the patient. Safety complete still needs a linked customer and a review reason when warnings appear. Schedule packs need a patient, prescriber, and Prescription checked. Rx packs need an Rx reference, Prescription checked, and prescribed qty. Tracked packs need a batch. Tax override needs a reason. Discount over the sign-off limit waits for approval.',
    denied:
      'This counter cannot save Sales bills, or a cashier-only login cannot dispense Schedule H, H1, X, or NDPS stock.',
    conflict: 'Draft warnings, floor qty, or this bill changed. Re-check, then save again.',
    failure: 'Could not save this bill. Check the connection and try again.',
    successWithInvoice: (invoiceNumber: string) =>
      `Bill ${invoiceNumber} saved as a draft at this counter.`,
    successSafety: 'Safety review recorded. Sale posting still waits on a saved bill.',
  },

  offer: {
    panelAria: 'Schemes on this bill',
    apply: 'Apply scheme',
    loading: 'Loading schemes on this bill…',
    empty: 'No live scheme fits this bill.',
    applied: (name: string) => `${name} applied on this bill.`,
    ambiguous:
      'Two live schemes share the same priority on a line. Change priority on Schemes, then apply again.',
    validation: 'Save this bill first, then apply a scheme.',
    conflict: 'This bill was updated on another counter. Refresh, then apply the scheme again.',
    failure: 'Could not apply this scheme. Check the connection and try again.',
  },

  holdHints: {
    validation: 'Save this bill first, then hold it if the patient steps away.',
    conflict: 'This bill was updated on another counter. Refresh, then hold again.',
    failure: 'Could not hold this bill. Check the connection and try again.',
  },

  resume: {
    withNumber: (invoiceNumber: string) => `Held bill ${invoiceNumber} is back on this counter.`,
    withoutNumber: 'Held bill is back on this counter.',
    draftWithNumber: (invoiceNumber: string) =>
      `Open bill ${invoiceNumber} is back on this counter.`,
    reviewSuffix: ' Floor qty, price, or GST changed — review before collect.',
    notOpen: 'Only draft or held bills can be continued on Sales.',
    failure: 'Could not open this bill on Sales. Try again from Orders.',
  },

  collect: {
    planLimit: 'Not on this plan. Points stay on the patient until Growth or Pro is back.',
    creditLimit:
      'Khata is over the approved limit. Reduce khata or take cash, UPI, card, or bank.',
    khataCustomer: 'Link a patient before putting this bill on khata.',
    insufficientPoints: 'This patient does not have enough points for that redeem.',
    redeemLimit: 'Points can cover at most 20% of this bill.',
    loyaltyCustomer: 'Link a patient before using points.',
    tpaIncomplete: 'Insurance / TPA needs insurer name and policy number.',
    validation: 'Tender must cover this bill. Add the rest or put it on khata for a linked patient.',
    conflict: 'This bill total changed. Refresh, then collect again.',
    failure: 'Could not collect this bill. Check the connection and try again.',
  },

  invoiceOutput: {
    loading: 'Preparing the A4 bill…',
    empty: 'Collect this bill to print the A4 invoice.',
    emailRequired: 'This patient has no email on file. Add one before sending a bill copy.',
    denied: 'This counter cannot print Sales bills.',
    conflict: 'This bill changed. Refresh, then print again.',
    failure: 'Could not prepare this A4 bill. Check the line and try again.',
    emailQueued: 'Bill copy queued for this patient.',
    ready: 'A4 bill ready.',
  },

  discountApproval: {
    pending: 'Waiting for sign-off on this discount before the bill can complete.',
    approved: 'Discount signed off. You can complete this bill when the rest of the counter is ready.',
    rejected: 'Reduce the discount and apply on this bill again.',
  },

  safety: {
    panelAria: 'Medication safety',
    allergyTitle: 'Allergy warning',
    compositionTitle: 'Duplicate composition',
    reviewRequired: 'Review required',
    reasonLabel: 'Review reason',
    needReason: 'A review reason is required before continuing.',
    needCustomer: 'Link a customer before completing a draft with safety warnings.',
    neverSafe: 'Not checked is never treated as safe.',
    notChecked: 'Not checked',
    allergy: (allergen: string, productName: string) =>
      `Allergy match: ${allergen} on ${productName} — review before completing.`,
    composition: (names: string, composition: string) =>
      `Same composition on ${names} (${composition}) — review before completing.`,
    thisMedicine: 'this medicine',
    allergenFallback: 'allergen',
    draftLines: 'draft lines',
    compositionFallback: 'composition',
  },

  thunk: {
    medicineNotFound: 'Medicine not found in catalogue.',
    lineNotFound: 'Line not found.',
    barcodeMiss: 'No medicine matched that barcode or batch number.',
    needPrices: 'Add medicines with MRP and selling price before saving.',
    needCustomer: 'Select a customer or continue as walk-in before billing.',
    controlledNeeds: 'Schedule packs need a patient, prescriber, and Prescription checked.',
    rxNeeds: 'Rx packs need Prescription checked, doctor, Rx reference, and prescribed qty.',
    needBatch: 'Pick a batch for every tracked pack before saving.',
    needPaymentMode: 'Pick a payment method before charging.',
    convertFailed: 'Could not convert that pack unit. Keep this line and retry.',
    collected: (invoiceNumber: string) => `Bill ${invoiceNumber} collected at this counter.`,
    held: (invoiceNumber: string) => `Bill ${invoiceNumber} sent to reception — pay later.`,
  },
} as const;

export function posStatusMessage(
  status: PageStatus,
  invoiceNumber?: string | null,
  hint?: string | null,
): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return POS_CONTENT.status.loading;
    case 'empty':
      return POS_CONTENT.status.empty;
    case 'validation':
      return POS_CONTENT.status.validation;
    case 'denied':
      return POS_CONTENT.status.denied;
    case 'conflict':
      return POS_CONTENT.status.conflict;
    case 'failure':
      return POS_CONTENT.status.failure;
    case 'success':
      return invoiceNumber
        ? POS_CONTENT.status.successWithInvoice(invoiceNumber)
        : POS_CONTENT.status.successSafety;
    default:
      return null;
  }
}
