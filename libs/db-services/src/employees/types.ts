export const EMPLOYEE_POSITIONS = [
  'owner',
  'manager',
  'pharmacist',
  'cashier',
  'helper',
  'other',
] as const;
export type EmployeePosition = (typeof EMPLOYEE_POSITIONS)[number];

export const EMPLOYEE_STATUSES = ['active', 'inactive', 'separated'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_GENDERS = ['female', 'male', 'other', 'undisclosed'] as const;
export type EmployeeGender = (typeof EMPLOYEE_GENDERS)[number];

export const EMPLOYEE_DOCUMENT_TYPES = ['id_proof', 'pharmacist_registration', 'other'] as const;
export type EmployeeDocumentType = (typeof EMPLOYEE_DOCUMENT_TYPES)[number];

export interface EmployeeRecord {
  employeeId: string;
  tenantId: string;
  locationId: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: EmployeeGender | null;
  address: string | null;
  photoObjectKey: string | null;
  position: EmployeePosition;
  positionLabel: string | null;
  status: EmployeeStatus;
  joinDate: string | null;
  userId: string | null;
  panCiphertext: string | null;
  aadhaarCiphertext: string | null;
  pharmacistRegistrationNo: string | null;
  pharmacistRegistrationExpiry: string | null;
  bankAccountHolder: string | null;
  bankAccountNumberCiphertext: string | null;
  bankIfsc: string | null;
  bankUpiId: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeDocumentRecord {
  documentId: string;
  employeeId: string;
  type: EmployeeDocumentType;
  objectKey: string;
  fileName: string;
  uploadedAt: Date;
}

export type CreateEmployeeInput = Pick<
  EmployeeRecord,
  'tenantId' | 'locationId' | 'fullName' | 'phone' | 'position'
> &
  Partial<Omit<EmployeeRecord, 'employeeId' | 'createdAt' | 'updatedAt'>> & {
    employeeId?: string;
    employeeCode?: string;
  };

export type UpdateEmployeeInput = Partial<
  Omit<EmployeeRecord, 'employeeId' | 'tenantId' | 'locationId' | 'createdAt' | 'updatedAt'>
>;

export interface ListEmployeesInput {
  tenantId: string;
  locationId: string;
  position?: EmployeePosition;
  status?: EmployeeStatus;
  q?: string;
  page: number;
  pageSize: number;
}

export interface ListEmployeesResult {
  items: EmployeeRecord[];
  total: number;
}

export interface EmployeeSummary {
  headcount: { total: number; active: number; inactive: number; separated: number };
  composition: Array<{ position: EmployeePosition; count: number }>;
}

export interface EmployeesIdempotencyRecord {
  tenantId: string;
  idempotencyKey: string;
  bodyHash: string;
  employeeId: string;
}

export interface EmployeesRepository {
  createEmployee(input: CreateEmployeeInput): Promise<EmployeeRecord>;
  getById(employeeId: string): Promise<EmployeeRecord | undefined>;
  findByUserId(tenantId: string, userId: string): Promise<EmployeeRecord | undefined>;
  findByCode(tenantId: string, employeeCode: string): Promise<EmployeeRecord | undefined>;
  updateEmployee(
    employeeId: string,
    patch: UpdateEmployeeInput,
  ): Promise<EmployeeRecord | undefined>;
  listEmployees(input: ListEmployeesInput): Promise<ListEmployeesResult>;
  summarize(tenantId: string, locationId: string): Promise<EmployeeSummary>;
  listPharmacistEligible(tenantId: string, locationId: string): Promise<EmployeeRecord[]>;
  nextEmployeeCode(tenantId: string): Promise<string>;
  addDocument(
    input: Omit<EmployeeDocumentRecord, 'documentId' | 'uploadedAt'> & {
      documentId?: string;
      uploadedAt?: Date;
    },
  ): Promise<EmployeeDocumentRecord>;
  listDocuments(employeeId: string): Promise<EmployeeDocumentRecord[]>;
  getDocument(employeeId: string, documentId: string): Promise<EmployeeDocumentRecord | undefined>;
  deleteDocument(employeeId: string, documentId: string): Promise<boolean>;
  countDocuments(employeeId: string): Promise<number>;
  getIdempotency(tenantId: string, key: string): Promise<EmployeesIdempotencyRecord | undefined>;
  putIdempotency(record: EmployeesIdempotencyRecord): Promise<void>;
}
