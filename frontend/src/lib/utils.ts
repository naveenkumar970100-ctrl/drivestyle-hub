import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalRole = "Staff" | "Merchant";
export type Role = "Admin" | "Staff" | "Merchant" | "Customer";

export interface Approval {
  name: string;
  email: string;
  role: ApprovalRole;
  date: string;
  status: ApprovalStatus;
}

const APPROVALS_KEY = "approvals";
const REGISTRATIONS_KEY = "registrations";
const APPROVAL_EVENTS_KEY = "approval_events";

function readApprovals(): Approval[] {
  const raw = localStorage.getItem(APPROVALS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Approval[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeApprovals(items: Approval[]) {
  localStorage.setItem(APPROVALS_KEY, JSON.stringify(items));
}

export function addApproval(entry: Omit<Approval, "date" | "status">) {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const items = readApprovals();
  const existingIndex = items.findIndex((a) => a.email === entry.email && a.role === entry.role);
  const next: Approval = { ...entry, date, status: "pending" };
  if (existingIndex >= 0) {
    items[existingIndex] = next;
  } else {
    items.push(next);
  }
  writeApprovals(items);
}

export function listApprovals(status?: ApprovalStatus): Approval[] {
  const items = readApprovals();
  return status ? items.filter((a) => a.status === status) : items;
}

export function setApprovalStatus(email: string, status: ApprovalStatus) {
  const items = readApprovals();
  const idx = items.findIndex((a) => a.email === email);
  if (idx >= 0) {
    items[idx] = { ...items[idx], status };
    writeApprovals(items);
    const role = items[idx].role;
    addApprovalEvent({ email, role, status });
  }
}

export function isApproved(email: string): boolean {
  const items = readApprovals();
  const found = items.find((a) => a.email === email);
  return !!found && found.status === "approved";
}

export interface Registration {
  name: string;
  email: string;
  role: Role;
  date: string;
}

export function addRegistration(entry: Omit<Registration, "date">) {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const raw = localStorage.getItem(REGISTRATIONS_KEY);
  const items: Registration[] = raw ? (JSON.parse(raw) as Registration[]) : [];
  const existingIndex = items.findIndex((a) => a.email === entry.email);
  const next: Registration = { ...entry, date };
  if (existingIndex >= 0) {
    items[existingIndex] = next;
  } else {
    items.push(next);
  }
  localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(items));
}

export function listRegistrations(role?: Role): Registration[] {
  const raw = localStorage.getItem(REGISTRATIONS_KEY);
  const items: Registration[] = raw ? (JSON.parse(raw) as Registration[]) : [];
  return role ? items.filter((r) => r.role === role) : items;
}
export function deleteRegistration(email: string) {
  const raw = localStorage.getItem(REGISTRATIONS_KEY);
  const items: Registration[] = raw ? (JSON.parse(raw) as Registration[]) : [];
  const next = items.filter((r) => r.email !== email);
  localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(next));
}

export interface ApprovalEvent {
  email: string;
  role: ApprovalRole;
  status: ApprovalStatus;
  date: string;
}

export function addApprovalEvent(entry: Omit<ApprovalEvent, "date">) {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const raw = localStorage.getItem(APPROVAL_EVENTS_KEY);
  const items: ApprovalEvent[] = raw ? (JSON.parse(raw) as ApprovalEvent[]) : [];
  items.push({ ...entry, date });
  localStorage.setItem(APPROVAL_EVENTS_KEY, JSON.stringify(items));
}

export function listApprovalEvents(): ApprovalEvent[] {
  const raw = localStorage.getItem(APPROVAL_EVENTS_KEY);
  const items: ApprovalEvent[] = raw ? (JSON.parse(raw) as ApprovalEvent[]) : [];
  return items;
}

export interface AuthSession {
  email: string;
  role: Role;
  token?: string;
}

const AUTH_KEY = "auth_session";

export function getAuth(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuth(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

type CreateStaffInput = { role: "staff"; name: string; email: string; phone: string; staffRole: string; password: string };
type CreateMerchantInput = { role: "merchant"; shopName: string; email: string; phone: string; location: string; password: string };
export async function createAdminUser(input: CreateStaffInput | CreateMerchantInput) {
  const session = getAuth();
  if (!session || !session.token || session.role !== "Admin") {
    throw new Error("Unauthorized");
  }
  const origin = typeof location !== "undefined" ? location.origin : "http://localhost:8080";
  const apiBase = "http://localhost:5000";
  const endpoints = [
    "/api/users/admin/create",
    "/api/users/create",
    "/api/admin/create",
    "/api/auth/admin/create",
    `${apiBase}/api/users/admin/create`,
    `${apiBase}/api/users/create`,
    `${apiBase}/api/admin/create`,
    `${apiBase}/api/auth/admin/create`,
  ];
  let lastError: string | null = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(input),
      });
      let data: unknown = {};
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok) {
        return data;
      }
      const msg =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? ((data as { message: string }).message || "").trim()
          : "";
      lastError = msg.length > 0 ? msg : `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastError || "Failed to create user");
}

export type BookingStatus = "Upcoming" | "Completed" | "Cancelled";

export interface Booking {
  id: string;
  customerEmail: string;
  vehicle: "car" | "bike";
  service: string;
  date: string;
  time: string;
  slot?: string;
  price?: string;
  status: BookingStatus;
  createdAt: string;
}

const BOOKINGS_KEY = "bookings";

function readBookings(): Booking[] {
  const raw = localStorage.getItem(BOOKINGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBookings(items: Booking[]) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(items));
}

export function addBooking(entry: Omit<Booking, "id" | "status" | "createdAt">) {
  const now = new Date();
  const createdAt = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const items = readBookings();
  const next: Booking = { ...entry, id, status: "Upcoming", createdAt };
  items.push(next);
  writeBookings(items);
}

export function listBookings(): Booking[] {
  return readBookings();
}

export function listCustomerBookings(email: string): Booking[] {
  return readBookings().filter((b) => b.customerEmail === email);
}

export function updateBooking(id: string, patch: Partial<Omit<Booking, "id" | "customerEmail" | "createdAt">>) {
  const items = readBookings();
  const idx = items.findIndex((b) => b.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...patch };
    writeBookings(items);
  }
}

export function setBookingStatus(id: string, status: BookingStatus) {
  updateBooking(id, { status });
}

export function assignBookingSlot(id: string, slot: string) {
  updateBooking(id, { slot });
}

export type VehicleType = "car" | "bike";

export interface CustomerVehicle {
  id: string;
  ownerEmail: string;
  type: VehicleType;
  make: string;
  model: string;
  year?: string;
  engine?: string;
  displacement?: string;
  power_hp?: string;
  vin?: string;
  plate?: string;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  vehicle: VehicleType;
  title: string;
  desc: string;
  price: number;
  active: boolean;
}

const SERVICES_KEY = "services";

function readServices(): ServiceItem[] {
  const raw = localStorage.getItem(SERVICES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ServiceItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeServices(items: ServiceItem[]) {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(items));
}

const VEHICLES_KEY = "customer_vehicles";

function readVehicles(): CustomerVehicle[] {
  const raw = localStorage.getItem(VEHICLES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomerVehicle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVehicles(items: CustomerVehicle[]) {
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(items));
}

export function listCustomerVehicles(ownerEmail: string): CustomerVehicle[] {
  return readVehicles().filter((v) => v.ownerEmail === ownerEmail);
}

export async function fetchVehicleDetails(input: { type: VehicleType; make?: string; model?: string; year?: string; vin?: string; reg?: string }) {
  const params = new URLSearchParams();
  params.set("type", input.type);
  if (input.make) params.set("make", input.make);
  if (input.model) params.set("model", input.model);
  if (input.year) params.set("year", input.year);
  if (input.vin) params.set("vin", input.vin);
  if (input.reg) params.set("reg", input.reg);
  const endpoints = [
    `/api/users/vehicles/lookup?${params.toString()}`,
    `http://localhost:5000/api/users/vehicles/lookup?${params.toString()}`,
  ];
  let lastErr = "Lookup failed";
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      let data: any = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok && data && data.vehicle) {
        return data.vehicle as { make?: string; model?: string; year?: string; engine?: string; displacement?: string; power_hp?: string; type?: string; registration?: string };
      }
      lastErr =
        (data && typeof data.message === "string" && data.message) ||
        `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export function addCustomerVehicle(ownerEmail: string, entry: Omit<CustomerVehicle, "id" | "ownerEmail" | "createdAt">) {
  const now = new Date();
  const createdAt = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const items = readVehicles();
  items.push({ ...entry, id, ownerEmail, createdAt });
  writeVehicles(items);
}

export function deleteCustomerVehicle(id: string) {
  const items = readVehicles().filter((v) => v.id !== id);
  writeVehicles(items);
}

function seedServicesIfEmpty() {
  const items = readServices();
  if (items.length > 0) return;
  const seed: ServiceItem[] = [
    { id: "car-general", vehicle: "car", title: "General Service", desc: "Full checkup and preventive maintenance", price: 49, active: true },
    { id: "car-oil", vehicle: "car", title: "Oil & Filter", desc: "Synthetic oil change with filter", price: 29, active: true },
    { id: "car-engine", vehicle: "car", title: "Engine Repair", desc: "Diagnostics, tune-up, and repairs", price: 199, active: true },
    { id: "car-tuning", vehicle: "car", title: "Performance Tuning", desc: "ECU remap and performance upgrades", price: 149, active: true },
    { id: "car-detail", vehicle: "car", title: "Detailing & Paint", desc: "Paint correction and ceramic coat", price: 99, active: true },
    { id: "car-claims", vehicle: "car", title: "Insurance Claims", desc: "End-to-end claim assistance", price: 0, active: true },
    { id: "bike-periodic", vehicle: "bike", title: "Periodic Service", desc: "Complete two-wheeler maintenance and safety checks", price: 29, active: true },
    { id: "bike-oil", vehicle: "bike", title: "Oil Change", desc: "Engine oil and filter replacement", price: 19, active: true },
    { id: "bike-brake", vehicle: "bike", title: "Brake Service", desc: "Brake pads, discs inspection and replacement", price: 25, active: true },
    { id: "bike-chain", vehicle: "bike", title: "Chain & Sprocket", desc: "Adjustment, lubrication, and replacement", price: 24, active: true },
    { id: "bike-detail", vehicle: "bike", title: "Detailing", desc: "Wash, polish, and ceramic coat options", price: 39, active: true },
    { id: "bike-claims", vehicle: "bike", title: "Insurance Claims", desc: "Hassle-free claim assistance", price: 0, active: true },
  ];
  writeServices(seed);
}

export function listServices(vehicle?: VehicleType): ServiceItem[] {
  seedServicesIfEmpty();
  const items = readServices().filter((s) => s.active);
  return vehicle ? items.filter((s) => s.vehicle === vehicle) : items;
}

export function addService(entry: Omit<ServiceItem, "id">) {
  const id = `${entry.vehicle}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const items = readServices();
  items.push({ ...entry, id });
  writeServices(items);
}

export function updateService(id: string, patch: Partial<Omit<ServiceItem, "id">>) {
  const items = readServices();
  const idx = items.findIndex((s) => s.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...patch };
    writeServices(items);
  }
}

export function deleteService(id: string) {
  const items = readServices().filter((s) => s.id !== id);
  writeServices(items);
}

export function setServicePrice(id: string, price: number) {
  updateService(id, { price });
}

export type StaffRoleType = "Staff";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRoleType;
  active: boolean;
}

const STAFF_KEY = "staff_members";

function readStaff(): StaffMember[] {
  const raw = localStorage.getItem(STAFF_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StaffMember[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStaff(items: StaffMember[]) {
  localStorage.setItem(STAFF_KEY, JSON.stringify(items));
}

export function listStaff(role?: StaffRoleType): StaffMember[] {
  const items = readStaff();
  return role ? items.filter((s) => s.role === role) : items;
}

export function addStaff(entry: Omit<StaffMember, "id" | "active">) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const items = readStaff();
  items.push({ ...entry, id, active: true });
  writeStaff(items);
}

export function updateStaff(id: string, patch: Partial<Omit<StaffMember, "id">>) {
  const items = readStaff();
  const idx = items.findIndex((s) => s.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...patch };
    writeStaff(items);
  }
}

export function deleteStaff(id: string) {
  const items = readStaff().filter((s) => s.id !== id);
  writeStaff(items);
}

export type JobStatus = "Assigned" | "InProgress" | "Done";

export interface Job {
  id: string;
  bookingId: string;
  staffId: string;
  status: JobStatus;
  assignedAt: string;
}

const JOBS_KEY = "jobs";

function readJobs(): Job[] {
  const raw = localStorage.getItem(JOBS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Job[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJobs(items: Job[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(items));
}

export function listJobs(): Job[] {
  return readJobs();
}

export function listJobsByBooking(bookingId: string): Job[] {
  return readJobs().filter((j) => j.bookingId === bookingId);
}

export function assignJob(bookingId: string, staffId: string) {
  const now = new Date();
  const assignedAt = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const items = readJobs();
  const existing = items.find((j) => j.bookingId === bookingId);
  if (existing) {
    existing.staffId = staffId;
    existing.status = "Assigned";
    writeJobs(items);
    return;
  }
  items.push({ id, bookingId, staffId, status: "Assigned", assignedAt });
  writeJobs(items);
}

export function setJobStatus(id: string, status: JobStatus) {
  const items = readJobs();
  const idx = items.findIndex((j) => j.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], status };
    writeJobs(items);
  }
}

export type PaymentStatus = "Unpaid" | "Paid";

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method?: string;
  status: PaymentStatus;
  createdAt: string;
}

const PAYMENTS_KEY = "payments";

function readPayments(): Payment[] {
  const raw = localStorage.getItem(PAYMENTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Payment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePayments(items: Payment[]) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(items));
}

export function listPayments(): Payment[] {
  return readPayments();
}

export function addPayment(entry: Omit<Payment, "id" | "status" | "createdAt">) {
  const now = new Date();
  const createdAt = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const items = readPayments();
  items.push({ ...entry, id, status: "Unpaid", createdAt });
  writePayments(items);
}

export function setPaymentStatus(id: string, status: PaymentStatus) {
  const items = readPayments();
  const idx = items.findIndex((p) => p.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], status };
    writePayments(items);
  }
}

export type InvoiceStatus = "Generated" | "Paid";

export interface Invoice {
  id: string;
  bookingId: string;
  customerEmail: string;
  amount: number;
  invoiceNo: string;
  status: InvoiceStatus;
  createdAt: string;
}

const INVOICES_KEY = "invoices";

function readInvoices(): Invoice[] {
  const raw = localStorage.getItem(INVOICES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Invoice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInvoices(items: Invoice[]) {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(items));
}

export function listInvoices(): Invoice[] {
  return readInvoices();
}

export function generateInvoice(entry: { bookingId: string; customerEmail: string; amount: number }): Invoice {
  const now = new Date();
  const createdAt = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const invoiceNo = `INV-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const items = readInvoices();
  const created: Invoice = { id, bookingId: entry.bookingId, customerEmail: entry.customerEmail, amount: entry.amount, invoiceNo, status: "Generated", createdAt };
  items.push(created);
  writeInvoices(items);
  return created;
}

export function markInvoicePaid(id: string) {
  const items = readInvoices();
  const idx = items.findIndex((inv) => inv.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], status: "Paid" };
    writeInvoices(items);
  }
}

export function findBooking(id: string): Booking | undefined {
  return readBookings().find((b) => b.id === id);
}
