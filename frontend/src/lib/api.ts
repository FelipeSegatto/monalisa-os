const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Prefixa um path relativo ("/uploads/...") devolvido pela API com a origem da API. */
export function apiFileUrl(relativePath: string): string;
export function apiFileUrl(relativePath: string | null): string | null;
export function apiFileUrl(relativePath: string | null): string | null {
  return relativePath ? `${API_BASE_URL}${relativePath}` : null;
}

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface Professional {
  id: number;
  name: string;
  color: string;
}

export interface Appointment {
  id: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  customerName: string;
  procedureName: string;
  professionalId: number;
  professionalName: string;
  professionalColor: string;
}

export interface AttentionItem {
  id: number;
  customerName: string;
  procedureName: string;
  startsAt: string;
  isToday: boolean;
}

export interface LowStockAttentionItem {
  id: number;
  name: string;
  unit: string;
  quantity: string;
  minQuantity: string;
}

export interface StockExpiryAttentionItem {
  id: number;
  name: string;
  unit: string;
  expiresAt: string;
}

export type AttentionGroup =
  | {
      type: "awaiting_confirmation";
      count: number;
      severity: "urgent" | "wait";
      items: AttentionItem[];
    }
  | {
      type: "low_stock";
      count: number;
      severity: "urgent" | "wait";
      items: LowStockAttentionItem[];
    }
  | {
      type: "expired_stock";
      count: number;
      severity: "urgent" | "wait";
      items: StockExpiryAttentionItem[];
    }
  | {
      type: "expiring_stock";
      count: number;
      severity: "urgent" | "wait";
      items: StockExpiryAttentionItem[];
    };

export interface NewCustomersBySource {
  source: string;
  label: string;
  count: number;
}

export interface MyFinance {
  weekSales: number;
  monthSales: number;
}

export interface DashboardOverview {
  referenceDate: string;
  professionals: Professional[];
  today: {
    date: string;
    updatedAt: string;
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
    nextAppointment: {
      time: string;
      customerName: string;
      procedureName: string;
      professionalName: string;
    } | null;
    awaitingConfirmation: {
      count: number;
      times: string[];
    };
  };
  appointments: Appointment[];
  attention: AttentionGroup[];
  period: {
    month: string;
    totalNewCustomers?: number;
    newCustomersBySource?: NewCustomersBySource[];
    attendedCustomers: number;
    returningCustomers: number;
  };
  finance?: FinanceSummary;
  procedureRevenue?: ProcedureRevenue[];
  monthlyInsights?: MonthlyInsights;
  myFinance?: MyFinance;
  observations: {
    referralPercentage: number | null;
  };
}

/** Formato de DashboardOverview quando role === 'ADMIN' (campos financeiros/clientes sempre presentes). */
export type AdminDashboardOverview = DashboardOverview & {
  finance: FinanceSummary;
  procedureRevenue: ProcedureRevenue[];
  monthlyInsights: MonthlyInsights;
  period: DashboardOverview["period"] & {
    totalNewCustomers: number;
    newCustomersBySource: NewCustomersBySource[];
  };
};

export type UserRole = "ADMIN" | "FUNCIONARIO";

export interface CurrentUser {
  id: number;
  name: string;
  firstName: string;
  role: UserRole;
  professionalId: number | null;
  roleLabel: string;
}

export interface AgendaAppointment {
  sessionReservation?:{id:number;entitlementId:number;status:string;entitlement:{variationId:number|null;description:string}}|null;
  expired:boolean;
  procedureId:number;
  customerId:number;
  equipmentId:number|null;
  id: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  customerName: string;
  procedureName: string;
  professionalId: number;
  professionalName: string;
  professionalColor: string;
}

export interface Agenda {
  date: string;
  professionals: Professional[];
  appointments: AgendaAppointment[];
}

export interface AgendaWeekDay {
  date: string;
  count: number;
}

export interface AgendaWeek {
  weekStart: string;
  days: AgendaWeekDay[];
}

export interface AgendaMonthDay {
  date: string;
  count: number;
}

export interface AgendaMonth {
  monthStart: string;
  monthStartWeekday: number;
  days: AgendaMonthDay[];
}

export interface CreateAppointmentInput {
  entitlementId?:number;
  variationId?:number|null;
  customerId: number;
  professionalId?: number;
  durationMinutes?: number;
  procedureId: number;
  startsAt: string;
  status?: AppointmentStatus;
}

export interface CreatedAppointment {
  id: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
}

export interface ProfessionalDetail {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  color: string;
  active: boolean;
  upcomingAppointments: number;
  appointmentsThisMonth: number;
}

export interface SaveProfessionalInput {
  name: string;
  phone: string | null;
  email: string | null;
  color: string | null;
  active: boolean;
}

export type AcquisitionSource = "INDICACAO" | "INSTAGRAM" | "WHATSAPP" | "GOOGLE" | "OUTRO";

export interface CustomerListItem {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  acquisitionSource: AcquisitionSource;
  acquisitionSourceLabel: string;
  createdAt: string;
  lastAppointmentAt: string | null;
  nextAppointmentAt: string | null;
}

export interface CustomerAppointment {
  id: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  procedureName: string;
  professionalName: string;
}

export interface CustomerDetail {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  acquisitionSource: AcquisitionSource;
  acquisitionSourceLabel: string;
  createdAt: string;
  nextAppointment: CustomerAppointment | null;
  history: CustomerAppointment[];
}

export interface SaveCustomerInput {
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  acquisitionSource: AcquisitionSource;
}

export interface ProcedurePriceVariation {
  id: number;
  groupName: string | null;
  name: string;
  reference: string | null;
  price: number;
  active: boolean;
  sortOrder: number;
}

export interface Procedure {
  id: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  detailImageUrl: string | null;
  durationMinutes: number;
  price: number;
  active: boolean;
  displayPrice: number;
  hasVariations: boolean;
  variations: ProcedurePriceVariation[];
}

export interface ProcedureDetail extends Procedure {
  categoryId: number;
  categoryName: string;
}

export interface ProcedureCategory {
  id: number;
  name: string;
  procedures: Procedure[];
}

export interface ProcedureVariationInput {
  id?: number | null;
  groupName: string | null;
  name: string;
  reference: string | null;
  price: number;
  active: boolean;
}

export interface SaveProcedureInput {
  categoryId: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  active: boolean;
  variations: ProcedureVariationInput[];
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

export async function sendJSON<T>(
  method: "POST" | "PUT" | "PATCH",
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return getJSON<DashboardOverview>("/api/v1/dashboard");
}

export function getCurrentUser(): Promise<CurrentUser> {
  return getJSON<CurrentUser>("/api/v1/me");
}

export function login(email: string, password: string): Promise<{ id: number; name: string; email: string }> {
  return sendJSON("POST", "/api/v1/auth/login", { email, password });
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiError("Não foi possível sair.", response.status);
  }
}

export function getAgenda(date?: string): Promise<Agenda> {
  const query = date ? `?date=${date}` : "";
  return getJSON<Agenda>(`/api/v1/agenda${query}`);
}

export function getAgendaWeek(date?: string): Promise<AgendaWeek> {
  const query = date ? `?date=${date}` : "";
  return getJSON<AgendaWeek>(`/api/v1/agenda/week${query}`);
}

export function getAgendaMonth(date?: string): Promise<AgendaMonth> {
  const query = date ? `?date=${date}` : "";
  return getJSON<AgendaMonth>(`/api/v1/agenda/month${query}`);
}

export function createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment> {
  return sendJSON<CreatedAppointment>("POST", "/api/v1/agenda", input);
}

export function setAppointmentStatus(
  id: number,
  status: AppointmentStatus,
  durationMinutes?:number,
): Promise<{ id: number; status: AppointmentStatus }> {
  return sendJSON("PATCH", `/api/v1/agenda/${id}/status`, { status, durationMinutes });
}

export interface AgendaBlock {
  id: number;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  professionalId: number;
  professionalName: string;
  professionalColor: string;
  createdByUserId: number;
}

export interface AgendaBlocksResponse {
  date: string;
  blocks: AgendaBlock[];
}

export function getAgendaBlocks(date?: string): Promise<AgendaBlocksResponse> {
  const query = date ? `?date=${date}` : "";
  return getJSON<AgendaBlocksResponse>(`/api/v1/agenda/blocks${query}`);
}

export interface CreateAgendaBlockInput {
  professionalId?: number;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface CreatedAgendaBlock {
  id: number;
  professionalId: number;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export function createAgendaBlock(input: CreateAgendaBlockInput): Promise<CreatedAgendaBlock> {
  return sendJSON<CreatedAgendaBlock>("POST", "/api/v1/agenda/blocks", input);
}

export async function deleteAgendaBlock(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/agenda/blocks/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? `Request to /api/v1/agenda/blocks/${id} failed with status ${response.status}`,
      response.status,
    );
  }
}

export async function getProfessionals(): Promise<ProfessionalDetail[]> {
  const { professionals } = await getJSON<{ professionals: ProfessionalDetail[] }>(
    "/api/v1/professionals",
  );
  return professionals;
}

export function getProfessional(id: number): Promise<ProfessionalDetail> {
  return getJSON<ProfessionalDetail>(`/api/v1/professionals/${id}`);
}

export function createProfessional(input: SaveProfessionalInput): Promise<ProfessionalDetail> {
  return sendJSON<ProfessionalDetail>("POST", "/api/v1/professionals", input);
}

export function updateProfessional(
  id: number,
  input: SaveProfessionalInput,
): Promise<ProfessionalDetail> {
  return sendJSON<ProfessionalDetail>("PUT", `/api/v1/professionals/${id}`, input);
}

export interface ProfessionalAccount {
  hasAccount: boolean;
  email: string | null;
}

export function getProfessionalAccount(id: number): Promise<ProfessionalAccount> {
  return getJSON<ProfessionalAccount>(`/api/v1/professionals/${id}/account`);
}

export function createProfessionalAccount(
  id: number,
  input: { email: string; password: string },
): Promise<ProfessionalAccount> {
  return sendJSON<ProfessionalAccount>("POST", `/api/v1/professionals/${id}/account`, input);
}

export async function getProcedureCategories(): Promise<ProcedureCategory[]> {
  const { categories } = await getJSON<{ categories: ProcedureCategory[] }>(
    "/api/v1/procedure-categories",
  );
  return categories;
}

export function getProcedure(id: number): Promise<ProcedureDetail> {
  return getJSON<ProcedureDetail>(`/api/v1/procedures/${id}`);
}

export function createProcedure(input: SaveProcedureInput): Promise<ProcedureDetail> {
  return sendJSON<ProcedureDetail>("POST", "/api/v1/procedures", input);
}

export function updateProcedure(
  id: number,
  input: SaveProcedureInput,
): Promise<ProcedureDetail> {
  return sendJSON<ProcedureDetail>("PUT", `/api/v1/procedures/${id}`, input);
}

export function setProcedureActive(id: number, active: boolean): Promise<ProcedureDetail> {
  return sendJSON<ProcedureDetail>("PATCH", `/api/v1/procedures/${id}/active`, { active });
}

export function uploadProcedureImages(
  id: number,
  images: { cover?: File; detail?: File },
): Promise<ProcedureDetail> {
  const formData = new FormData();
  if (images.cover) formData.append("cover", images.cover);
  if (images.detail) formData.append("detail", images.detail);
  return sendFormData<ProcedureDetail>(`/api/v1/procedures/${id}/images`, formData);
}

export interface ProcedureMaterial {
  stockItemId: number;
  itemName: string;
  unit: string;
  quantity: string;
}

export interface SaveProcedureMaterialInput {
  stockItemId: number;
  quantity: number;
}

export async function getProcedureMaterials(procedureId: number): Promise<ProcedureMaterial[]> {
  const { materials } = await getJSON<{ materials: ProcedureMaterial[] }>(
    `/api/v1/procedures/${procedureId}/materials`,
  );
  return materials;
}

export async function setProcedureMaterials(
  procedureId: number,
  materials: SaveProcedureMaterialInput[],
): Promise<ProcedureMaterial[]> {
  const { materials: saved } = await sendJSON<{ materials: ProcedureMaterial[] }>(
    "PUT",
    `/api/v1/procedures/${procedureId}/materials`,
    materials,
  );
  return saved;
}

export async function getCustomers(filter: {
  search?: string;
  source?: AcquisitionSource;
}): Promise<CustomerListItem[]> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.source) params.set("source", filter.source);
  const query = params.toString() ? `?${params.toString()}` : "";
  const { customers } = await getJSON<{ customers: CustomerListItem[] }>(
    `/api/v1/customers${query}`,
  );
  return customers;
}

export function getCustomer(id: number): Promise<CustomerDetail> {
  return getJSON<CustomerDetail>(`/api/v1/customers/${id}`);
}

export function createCustomer(input: SaveCustomerInput): Promise<CustomerDetail> {
  return sendJSON<CustomerDetail>("POST", "/api/v1/customers", input);
}

export function updateCustomer(id: number, input: SaveCustomerInput): Promise<CustomerDetail> {
  return sendJSON<CustomerDetail>("PUT", `/api/v1/customers/${id}`, input);
}

export interface CustomerNote {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author: string;
}

export async function getNotes(customerId: number): Promise<CustomerNote[]> {
  const { notes } = await getJSON<{ notes: CustomerNote[] }>(
    `/api/v1/customers/${customerId}/notes`,
  );
  return notes;
}

export async function createNote(
  customerId: number,
  input: { title: string; content: string },
): Promise<CustomerNote[]> {
  const { notes } = await sendJSON<{ notes: CustomerNote[] }>(
    "POST",
    `/api/v1/customers/${customerId}/notes`,
    input,
  );
  return notes;
}

export async function updateNote(
  customerId: number,
  noteId: number,
  input: { title: string; content: string },
): Promise<CustomerNote[]> {
  const { notes } = await sendJSON<{ notes: CustomerNote[] }>(
    "PUT",
    `/api/v1/customers/${customerId}/notes/${noteId}`,
    input,
  );
  return notes;
}

export async function deleteNote(customerId: number, noteId: number): Promise<CustomerNote[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/customers/${customerId}/notes/${noteId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const { notes } = (await response.json()) as { notes: CustomerNote[] };
  return notes;
}

export type DocumentType = "ANAMNESIS" | "CONTRACT" | "OTHER";
export type DocumentStatus = "AWAITING_SIGNATURE" | "SIGNED";

export interface CustomerDocument {
  id: number;
  appointmentId: number | null;
  procedureId: number | null;
  procedureName: string | null;
  type: DocumentType;
  status: DocumentStatus;
  fileUrl: string;
  originalFilename: string;
  signedBy: string | null;
  signedAt: string | null;
  note: string | null;
  createdAt: string;
}

async function sendFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export async function getDocuments(customerId: number): Promise<CustomerDocument[]> {
  const { documents } = await getJSON<{ documents: CustomerDocument[] }>(
    `/api/v1/customers/${customerId}/documents`,
  );
  return documents;
}

export interface UploadDocumentInput {
  file: File;
  type: DocumentType;
  status: DocumentStatus;
  procedureId?: number;
  appointmentId?: number;
  signedBy?: string;
  signedAt?: string;
  note?: string;
}

export async function uploadDocument(
  customerId: number,
  input: UploadDocumentInput,
): Promise<CustomerDocument[]> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("type", input.type);
  formData.set("status", input.status);
  if (input.procedureId) formData.set("procedureId", String(input.procedureId));
  if (input.appointmentId) formData.set("appointmentId", String(input.appointmentId));
  if (input.signedBy) formData.set("signedBy", input.signedBy);
  if (input.signedAt) formData.set("signedAt", input.signedAt);
  if (input.note) formData.set("note", input.note);

  const { documents } = await sendFormData<{ documents: CustomerDocument[] }>(
    `/api/v1/customers/${customerId}/documents`,
    formData,
  );
  return documents;
}

export type PhotoLabel = "BEFORE" | "AFTER" | "EVOLUTION" | "OTHER";

export interface CustomerPhoto {
  id: number;
  appointmentId: number | null;
  procedureId: number | null;
  procedureName: string | null;
  label: PhotoLabel | null;
  fileUrl: string;
  originalFilename: string;
  note: string | null;
  createdAt: string;
}

export async function getPhotos(customerId: number): Promise<CustomerPhoto[]> {
  const { photos } = await getJSON<{ photos: CustomerPhoto[] }>(
    `/api/v1/customers/${customerId}/photos`,
  );
  return photos;
}

export interface UploadPhotoInput {
  file: File;
  label?: PhotoLabel;
  procedureId?: number;
  appointmentId?: number;
  note?: string;
}

export async function uploadPhoto(
  customerId: number,
  input: UploadPhotoInput,
): Promise<CustomerPhoto[]> {
  const formData = new FormData();
  formData.set("file", input.file);
  if (input.label) formData.set("label", input.label);
  if (input.procedureId) formData.set("procedureId", String(input.procedureId));
  if (input.appointmentId) formData.set("appointmentId", String(input.appointmentId));
  if (input.note) formData.set("note", input.note);

  const { photos } = await sendFormData<{ photos: CustomerPhoto[] }>(
    `/api/v1/customers/${customerId}/photos`,
    formData,
  );
  return photos;
}

export type PaymentMethod = "PIX" | "CASH" | "CARD";
export type ExpenseCategory =
  | "INSUMOS"
  | "EQUIPAMENTOS_MANUTENCAO"
  | "MARKETING"
  | "ALUGUEL_ESTRUTURA"
  | "SERVICOS"
  | "PESSOAL"
  | "OUTROS";
export type ExpenseRecurrence = "ONCE" | "RECURRING";
export type SaleStatus = "CANCELLED" | "PENDING" | "PARTIAL" | "PAID";

export interface SaleItem {
  id: number;
  description: string;
  sessions: number;
  unitPrice: number;
  finalPrice: number;
}

export interface SalePayment {
  id: number;
  paidAt: string;
  method: PaymentMethod;
  installments: number | null;
  amount: number;
  reversal?:{reason:string;actorId:number;createdAt:string}|null;
}

export interface SaleSummary {
  categoryIds?: number[];
  id: number;
  customerId: number;
  customerName: string;
  professionalId: number | null;
  professionalName: string | null;
  discount: number;
  commissionPercent: number | null;
  cancelled: boolean;
  createdAt: string;
  subtotal: number;
  total: number;
  received: number;
  balance: number;
  status: SaleStatus;
}

export interface SaleDetail extends SaleSummary {
  items: SaleItem[];
  payments: SalePayment[];
}

export interface ExpenseSummary {
  id: number;
  description: string;
  category: ExpenseCategory;
  categoryLabel: string;
  supplier: string | null;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt: string | null;
  method: PaymentMethod | null;
  recurrence: ExpenseRecurrence;
  cancelled: boolean;
  createdAt: string;
}

export interface FinanceSummary {
  sales: number;
  received: number;
  receivable: number;
  expensesPaid: number;
  flow: number;
  ticketMedio: number;
}

export interface FinanceEvolutionPoint {
  month: string;
  sales: number;
  received: number;
  expenses: number;
}

export interface FinanceCompositionItem {
  categoryId: number;
  categoryName: string;
  total: number;
  percentage: number;
}

export interface ProcedureRevenue {
  procedureId: number;
  procedureName: string;
  revenue: number;
  sessions: number;
  ticket: number;
}

export interface MonthlyInsightProcedure extends ProcedureRevenue {
  previousRevenue: number;
  changePercent: number | null;
}

export interface MonthlyInsightExpenseCategory {
  category: string;
  categoryLabel: string;
  amount: number;
  previousAmount: number;
  changePercent: number | null;
}

export interface MonthlyInsights {
  procedures: {
    top: MonthlyInsightProcedure[];
    topMover: MonthlyInsightProcedure | null;
    topDecline: MonthlyInsightProcedure | null;
  };
  expenses: {
    top: MonthlyInsightExpenseCategory[];
  };
}

export interface FinancePendencias {
  receivable: SaleSummary[];
  payable: ExpenseSummary[];
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getFinanceSummary(start: Date, end: Date): Promise<FinanceSummary> {
  return getJSON<FinanceSummary>(
    `/api/v1/finance/summary?start=${toDateParam(start)}&end=${toDateParam(end)}`,
  );
}

export async function getFinanceEvolution(
  months: 1 | 3 | 6 | 12,
): Promise<FinanceEvolutionPoint[]> {
  const { evolution } = await getJSON<{ evolution: FinanceEvolutionPoint[] }>(
    `/api/v1/finance/evolution?months=${months}`,
  );
  return evolution;
}

export function getFinanceComposition(
  start: Date,
  end: Date,
): Promise<{ composition: FinanceCompositionItem[]; procedureRevenue: ProcedureRevenue[] }> {
  return getJSON(
    `/api/v1/finance/composition?start=${toDateParam(start)}&end=${toDateParam(end)}`,
  );
}

export function getFinancePendencias(): Promise<FinancePendencias> {
  return getJSON<FinancePendencias>("/api/v1/finance/pendencias");
}

export async function getSales(start: Date, end: Date): Promise<SaleSummary[]> {
  const { sales } = await getJSON<{ sales: SaleSummary[] }>(
    `/api/v1/finance/sales?start=${toDateParam(start)}&end=${toDateParam(end)}`,
  );
  return sales;
}

export interface CreateSaleItemInput {
  procedureId: number;
  procedurePriceVariationId: number | null;
  description: string;
  sessions: number;
  unitPrice: number;
  finalPrice: number;
}

export interface CreateSaleInput {
  requestKey:string;
  discountReason?:string;
  customerId: number;
  professionalId: number | null;
  discount: number;
  commissionPercent: number | null;
  items: CreateSaleItemInput[];
  initialPayment: { amount: number; method: PaymentMethod; installments: number | null } | null;
}

export function createSale(input: CreateSaleInput): Promise<SaleDetail> {
  return sendJSON<SaleDetail>("POST", "/api/v1/finance/sales", input);
}

export function getSale(id: number): Promise<SaleDetail> {
  return getJSON<SaleDetail>(`/api/v1/finance/sales/${id}`);
}

export async function getCustomerSales(customerId: number): Promise<SaleSummary[]> {
  const { sales } = await getJSON<{ sales: SaleSummary[] }>(
    `/api/v1/customers/${customerId}/sales`,
  );
  return sales;
}

export function registerSalePayment(
  id: number,
  input: { amount: number; method: PaymentMethod; installments: number | null;requestKey?:string },
): Promise<SaleDetail> {
  return sendJSON<SaleDetail>("POST", `/api/v1/finance/sales/${id}/payments`, input);
}

export function cancelSale(id: number,reason:string): Promise<SaleDetail> {
  return sendJSON<SaleDetail>("POST", `/api/v1/finance/sales/${id}/cancel`, {reason});
}

/** Reads the flat expense-records list (previous Financeiro widgets) and filters by due date client-side. */
export async function getExpenses(start: Date, end: Date): Promise<ExpenseSummary[]> {
  const { expenses } = await getJSON<{ expenses: ExpenseSummary[] }>("/api/v1/finance/expense-records");
  return expenses.filter((e) => {
    const due = new Date(e.dueDate + "T12:00:00Z").getTime();
    return due >= start.getTime() && due < end.getTime();
  });
}

export type ExpenseDestination = "GENERAL" | "PROCEDURES" | "MIXED";
export type ExpenseBasis = "VALUE" | "PERCENT";

export interface ExpenseAllocationLine {
  procedureId: number | null;
  value: number;
}

export interface CreateExpenseInput {
  description: string;
  category: ExpenseCategory;
  supplier: string | null;
  amount: number;
  dueDate: string;
  competenceMonth: string;
  recurrence: ExpenseRecurrence;
  destination: ExpenseDestination;
  basis: ExpenseBasis;
  allocations: ExpenseAllocationLine[];
  allocationNote: string;
  reason: string;
}

export interface ExpenseAllocationView {
  id: number;
  procedureId: number | null;
  procedureName: string | null;
  inputValue: number;
  amount: number;
}

export interface ExpenseRevisionView {
  id: number;
  version: number;
  description: string;
  category: ExpenseCategory;
  supplier: string | null;
  amount: number;
  dueDate: string;
  competenceMonth: string;
  recurrence: ExpenseRecurrence;
  destination: ExpenseDestination;
  basis: ExpenseBasis;
  allocationNote: string;
  reason: string;
  actorId: number;
  createdAt: string;
  allocations: ExpenseAllocationView[];
}

export interface ExpensePaymentView {
  id: number;
  type: "PAYMENT" | "REVERSAL";
  source: "SYSTEM" | "LEGACY";
  amount: number;
  method: PaymentMethod | null;
  occurredAt: string | null;
  actorId: number | null;
  reason: string | null;
  reversesId: number | null;
  reversed: boolean;
  createdAt: string;
}

export interface ExpenseEventView {
  id: number;
  type: string;
  reason: string | null;
  actorId: number;
  details: unknown;
  createdAt: string;
}

export interface ExpenseDetail {
  id: number;
  expenseModel: "LEGACY" | "V1";
  description: string;
  category: ExpenseCategory;
  supplier: string | null;
  amount: number;
  dueDate: string | null;
  competenceMonth: string | null;
  recurrence: ExpenseRecurrence;
  cancelled: boolean;
  paid: boolean;
  allocationRevision: number;
  historicalPending: boolean;
  createdAt: string | null;
  destination: ExpenseDestination | null;
  basis: ExpenseBasis | null;
  allocationNote: string | null;
  allocations: ExpenseAllocationView[];
  revisions: ExpenseRevisionView[];
  payments: ExpensePaymentView[];
  events: ExpenseEventView[];
}

export function createExpense(input: CreateExpenseInput): Promise<ExpenseDetail> {
  return sendJSON<ExpenseDetail>("POST", "/api/v1/finance/expenses", input);
}

export function reviseExpense(id: number, input: CreateExpenseInput): Promise<ExpenseDetail> {
  return sendJSON<ExpenseDetail>("POST", `/api/v1/finance/expenses/${id}/revisions`, input);
}

export function getExpenseDetail(id: number): Promise<ExpenseDetail> {
  return getJSON<ExpenseDetail>(`/api/v1/finance/expenses/${id}`);
}

export function listExpenses(params: {
  category?: ExpenseCategory;
  status?: "PAID" | "PENDING" | "CANCELLED";
  procedureId?: number;
  destination?: ExpenseDestination;
  dueStart?: string;
  dueEnd?: string;
  search?: string;
  before?: number;
}): Promise<{ expenses: ExpenseDetail[]; nextCursor: number | null }> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) query.set(key, String(value));
  const qs = query.toString();
  return getJSON(`/api/v1/finance/expenses${qs ? `?${qs}` : ""}`);
}

export function payExpense(
  id: number,
  input: { amount: number; method: PaymentMethod; paidAt: string; requestKey: string },
): Promise<ExpenseDetail> {
  return sendJSON<ExpenseDetail>("POST", `/api/v1/finance/expenses/${id}/pay`, input);
}

export function reverseExpensePayment(
  id: number,
  paymentId: number,
  input: { reason: string; requestKey: string },
): Promise<ExpenseDetail> {
  return sendJSON<ExpenseDetail>(
    "POST",
    `/api/v1/finance/expenses/${id}/payments/${paymentId}/reversal`,
    input,
  );
}

export function cancelExpense(id: number, reason: string): Promise<ExpenseDetail> {
  return sendJSON<ExpenseDetail>("POST", `/api/v1/finance/expenses/${id}/cancellation`, { reason });
}

export interface ProcedureComparisonRow {
  procedureId: number | null;
  procedureName: string | null;
  sold: number;
  received: number;
  expenseAttributed: number;
  expensePaidNet: number;
  executions: number;
  periodResult: number;
  cashBalance: number;
  previousSold: number;
  previousExpenseAttributed: number;
  changePercent: number | null;
}

export function getExpensePerformance(
  month: string,
): Promise<{ month: string; previousMonth: string; procedures: ProcedureComparisonRow[] }> {
  return getJSON(`/api/v1/finance/expense-performance?month=${month}`);
}

export async function getPublicCatalog(): Promise<ProcedureCategory[]> {
  const { categories } = await getJSON<{ categories: ProcedureCategory[] }>(
    "/api/v1/public/catalog",
  );
  return categories;
}

export interface CreateLeadInput {
  name: string;
  phone: string;
  procedureCategoryId: number | null;
  message: string | null;
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  procedureCategoryId: number | null;
  procedureCategoryName: string | null;
  message: string | null;
  status: "NEW" | "CONTACTED";
  createdAt: string;
}

export function createPublicLead(input: CreateLeadInput): Promise<Lead> {
  return sendJSON<Lead>("POST", "/api/v1/public/leads", input);
}

export async function getLeads(): Promise<Lead[]> {
  const { leads } = await getJSON<{ leads: Lead[] }>("/api/v1/leads");
  return leads;
}

export function setLeadStatus(id: number, status: Lead["status"]): Promise<Lead> {
  return sendJSON<Lead>("PATCH", `/api/v1/leads/${id}/status`, { status });
}

export async function getBookingSlots(date: string): Promise<string[]> {
  const { slots } = await getJSON<{ date: string; slots: string[] }>(
    `/api/v1/public/booking/slots?date=${date}`,
  );
  return slots;
}

export interface CreateFreeBookingInput {
  name: string;
  phone: string;
  startsAt: string;
}

export interface FreeBookingResult {
  appointmentId: number;
  startsAt: string;
  endsAt: string;
  customerId: number;
}

export function createFreeBooking(input: CreateFreeBookingInput): Promise<FreeBookingResult> {
  return sendJSON<FreeBookingResult>("POST", "/api/v1/public/booking/free", input);
}

export interface StockItemExpiry {
  date: string;
  status: "EXPIRED" | "NEAR";
}

export interface StockItem {
  id: number;
  name: string;
  unit: string;
  quantity: string;
  minQuantity: string;
  active: boolean;
  isLow: boolean;
  expiry: StockItemExpiry | null;
}

export interface SaveStockItemInput {
  name: string;
  unit: string;
  minQuantity: number;
  active?: boolean;
}

export interface StockMovement {
  actorId:number|null;
  reversesId:number|null;
  id: number;
  type: "IN" | "ADJUSTMENT" | "CONSUMPTION";
  quantityDelta: string;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface StockItemDetail extends StockItem {
  movements: StockMovement[];
}

export async function getStockItems(): Promise<StockItem[]> {
  const { items } = await getJSON<{ items: StockItem[] }>("/api/v1/stock/items");
  return items;
}

export function getStockItemDetail(id: number): Promise<StockItemDetail> {
  return getJSON<StockItemDetail>(`/api/v1/stock/items/${id}`);
}

export function createStockItem(
  input: SaveStockItemInput & { initialQuantity: number },
): Promise<StockItem> {
  return sendJSON<StockItem>("POST", "/api/v1/stock/items", input);
}

export function updateStockItem(id: number, input: SaveStockItemInput): Promise<StockItem> {
  return sendJSON<StockItem>("PUT", `/api/v1/stock/items/${id}`, input);
}

export function registerStockMovement(
  id: number,
  input: {
    type: "IN" | "ADJUSTMENT" | "CONSUMPTION";
    quantity: number;
    note: string;
    requestKey: string;
    expiresAt?: string | null;
  },
): Promise<StockItemDetail> {
  return sendJSON<StockItemDetail>("POST", `/api/v1/stock/items/${id}/movements`, input);
}

export type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
export type MaintenanceState = 'UNKNOWN' | 'OVERDUE' | 'DUE_SOON' | 'OK' | 'NOT_APPLICABLE';
export interface EquipmentComponent {
  id: number; code: string; name: string; serialNumber: string | null;
  specification: string | null; nominalCapacity: number | null; status: EquipmentStatus;
}
export interface Equipment {
  id: number; code: string; name: string; manufacturer: string | null; model: string | null;
  serialNumber: string | null; status: EquipmentStatus; shotTracking: 'NONE' | 'EQUIPMENT' | 'COMPONENT';
  maintenanceIntervalMonths: number; lastMaintenanceDate: string | null; nextMaintenanceDate: string | null;
  maintenanceState: MaintenanceState; components: EquipmentComponent[];
}
export interface EquipmentDetail extends Equipment {
  procedures: { procedure: { id: number; name: string } }[];
  events: { id: number; type: string; reason: string | null; createdAt: string; occurredOn: string | null;
    actor: { id: number; name: string }; details: Record<string, unknown> }[];
}
export interface EquipmentInput {
  name: string; manufacturer: string | null; model: string | null; serialNumber: string | null;
  shotTracking: Equipment['shotTracking']; maintenanceIntervalMonths: number;
}
export interface ComponentInput {
  name: string; serialNumber: string | null; specification: string | null; nominalCapacity: number | null;
}
export interface ProcedureEquipmentResources { reviewedAt: string | null; materialsReviewedAt: string | null; equipment: Equipment[] }
export const getEquipment = () => getJSON<{equipment: Equipment[]}>('/api/v1/equipment');
export const getEquipmentDetail = (id: number) => getJSON<EquipmentDetail>(`/api/v1/equipment/${id}`);
export const createEquipment = (data: EquipmentInput) => sendJSON<EquipmentDetail>('POST', '/api/v1/equipment', data);
export const updateEquipment = (id: number, data: EquipmentInput) => sendJSON<EquipmentDetail>('PUT', `/api/v1/equipment/${id}`, data);
export const createEquipmentComponent = (id: number, data: ComponentInput) => sendJSON<EquipmentDetail>('POST', `/api/v1/equipment/${id}/components`, data);
export const updateEquipmentComponent = (id: number, componentId: number, data: ComponentInput) => sendJSON<EquipmentDetail>('PUT', `/api/v1/equipment/${id}/components/${componentId}`, data);
export const changeEquipmentStatus = (id: number, status: EquipmentStatus, reason: string, componentId?: number) => sendJSON<EquipmentDetail>('PATCH', `/api/v1/equipment/${id}${componentId === undefined ? '' : `/components/${componentId}`}/status`, { status, reason });
export const scheduleEquipmentMaintenance = (id: number, nextDate: string, reason: string) => sendJSON<EquipmentDetail>('POST', `/api/v1/equipment/${id}/maintenance/schedule`, { nextDate, reason });
export const recordEquipmentMaintenance = (id: number, performedOn: string, reason: string, nextDate?: string) => sendJSON<EquipmentDetail>('POST', `/api/v1/equipment/${id}/maintenance`, { performedOn, reason, ...(nextDate ? {nextDate} : {}) });
export const getProcedureEquipment = (id: number) => getJSON<ProcedureEquipmentResources>(`/api/v1/procedures/${id}/equipment`);
export const setProcedureEquipment = (id: number, equipmentIds: number[]) => sendJSON<ProcedureEquipmentResources>('PUT', `/api/v1/procedures/${id}/equipment`, { equipmentIds });

export const getEquipmentHistory = (id: number, before: number) => getJSON<{events: EquipmentDetail['events']}>(`/api/v1/equipment/${id}/events?before=${before}`);

export interface ProfessionalCapabilities {
  procedureIds:number[]; priority:number|null;
  workingPeriods:{weekday:number;startMinute:number;endMinute:number}[];
  affectedAppointments:{id:number;procedureId:number;startsAt:string}[];
}
export const getProfessionalCapabilities=(id:number)=>getJSON<ProfessionalCapabilities>(`/api/v1/professionals/${id}/capabilities`);
export const saveProfessionalCapabilities=(id:number,input:Omit<ProfessionalCapabilities,'affectedAppointments'>)=>sendJSON<ProfessionalCapabilities>('PUT',`/api/v1/professionals/${id}/capabilities`,input);
export const getAvailableProfessionals=(procedureId:number,startsAt:string,durationMinutes?:number)=>getJSON<{id:number;name:string;color:string}[]>(`/api/v1/scheduling/available-professionals?${new URLSearchParams({procedureId:String(procedureId),startsAt,...(durationMinutes?{durationMinutes:String(durationMinutes)}:{})})}`);
export interface SchedulingSettings {assignmentPolicy:'PRIORITY'|'BALANCED'|'MANUAL';confirmationMode:'MANUAL'|'AUTOMATIC';holdMinutes:number}
export const getSchedulingSettings=()=>getJSON<SchedulingSettings>('/api/v1/scheduling/settings');
export const saveSchedulingSettings=(input:SchedulingSettings)=>sendJSON<SchedulingSettings>('PUT','/api/v1/scheduling/settings',input);
export type MaterialUseAnswer='USED'|'SMALL'|'NOT_USED';
export interface ExecutionInput {
  entitlementId?:number|null;
 procedureId:number;variationId?:number|null;professionalId:number;equipmentId?:number|null;
 materials:{stockItemId:number;usage:MaterialUseAnswer}[];shots:{componentId?:number|null;quantity:number}[];
}
export interface AttendanceResult {id:number;status:string;startedAt:string;completedAt:string|null;executions:unknown[]}
export const startAttendance=(id:number)=>sendJSON<AttendanceResult>('POST',`/api/v1/agenda/${id}/attendance`,{});
export const completeAttendance=(id:number,input:{requestKey:string;executions:ExecutionInput[]})=>sendJSON<AttendanceResult>('POST',`/api/v1/attendances/${id}/completion`,input);
export interface ShotCounters {equipmentId:number;tracking:Equipment['shotTracking'];consumed:number;initialized:boolean;equipmentCounter:number|null;components:{id:number;name:string;status:EquipmentStatus;capacity:number|null;initialized:boolean;consumed:number|null;remaining:number|null}[]}
export const getShotCounters=(id:number)=>getJSON<ShotCounters>(`/api/v1/equipment/${id}/shot-counters`);
export interface ShotEntry {id:number;type:string;componentId:number|null;quantityDelta:number;actorId:number;reason:string|null;createdAt:string;reversesId:number|null;replacesId?:number|null;
actor?:{id:number;name:string};component?:{id:number;name:string}|null;
execution?:{id:number;attendanceId:number;procedureName:string;variationName:string|null;professional:{id:number;name:string}}|null;
reversal?:{id:number}|null;replacement?:{id:number}|null}
export const getShotEntries=(id:number,before?:number)=>getJSON<ShotEntry[]>(`/api/v1/equipment/${id}/shot-ledger${before?`?before=${before}`:''}`);
export const postShotEntry=(id:number,input:{componentId:number|null;type:'OPENING'|'ADJUSTMENT';quantityDelta:number;reason:string;requestKey:string})=>sendJSON<ShotEntry>('POST',`/api/v1/equipment/${id}/shot-ledger`,input);
export const reverseShotEntry=(id:number,input:{reason:string;requestKey:string})=>sendJSON<ShotEntry>('POST',`/api/v1/shot-ledger/${id}/reversal`,input);
export const reverseStockMovement=(id:number,input:{note:string;requestKey:string})=>sendJSON<unknown>('POST',`/api/v1/stock/movements/${id}/reversal`,input);
export interface ProcedureActivityMetric {procedureId:number;procedureName:string;executions:number;previousExecutions:number;shots:number;previousShots:number;options:{variationId:number;name:string;executions:number}[];materials:{stockItemId:number;materialName:string;used:number;small:number;notUsed:number}[]}
export const getProcedureMetrics=(month:string)=>getJSON<{month:string;previousMonth:string;procedures:ProcedureActivityMetric[]}>(`/api/v1/procedure-metrics?month=${month}`);
export const cancelAttendance=(id:number,reason:string)=>sendJSON<AttendanceResult>('POST',`/api/v1/attendances/${id}/cancellation`,{reason});
export const reassignAppointment=(id:number,professionalId?:number)=>sendJSON<unknown>('PATCH',`/api/v1/scheduling/appointments/${id}/assignment`,{professionalId});
export const getReassignmentCandidates=(appointment:AgendaAppointment)=>getJSON<{id:number;name:string;color:string}[]>(`/api/v1/scheduling/available-professionals?${new URLSearchParams({procedureId:String(appointment.procedureId),startsAt:appointment.startsAt,durationMinutes:String(Math.round((+new Date(appointment.endsAt)-+new Date(appointment.startsAt))/60000)),excludeId:String(appointment.id)})}`);
export const correctShotEntry=(id:number,input:{quantity:number;reason:string;requestKey:string})=>sendJSON<ShotEntry>('POST',`/api/v1/shot-ledger/${id}/correction`,input);
export interface ProcedureSeries {procedureId:number|null;procedureName:string|null;sold:number[];received:number[];expenseAttributed:number[];expensePaidNet:number[];executions:number[];result:number[];cashBalance:number[]}
export interface ExpenseSeriesResponse {months:string[];total:{sold:number[];received:number[];expenseAttributed:number[];expensePaidNet:number[];result:number[];cashBalance:number[]}|null;procedures:ProcedureSeries[]}
export const getExpenseSeries=(months=6)=>getJSON<ExpenseSeriesResponse>(`/api/v1/finance/expense-series?months=${months}`);
export interface OfferSeriesEntry {offerId:number;offerName:string;sold:number[];received:number[]}
export const getOfferSeries=(months=6)=>getJSON<{months:string[];offers:OfferSeriesEntry[]}>(`/api/v1/commercial/offer-series?months=${months}`);
export interface OccupancySeriesEntry {professionalId:number;name:string;color:string;availableMinutes:number[];bookedMinutes:number[];occupancyPercent:(number|null)[]}
export const getOccupancySeries=(months=6)=>getJSON<{months:string[];professionals:OccupancySeriesEntry[]}>(`/api/v1/dashboard/occupancy?months=${months}`);
