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
  address?: string;
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
  name?: string;
}

const AUTH_KEY = "auth_session";

export function getAuth(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuth(session: AuthSession) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearAuth() {
  try { sessionStorage.removeItem(AUTH_KEY); } catch { void 0; }
  try {
    if (typeof document !== "undefined") {
      document.cookie = `${AUTH_KEY}=; path=/; max-age=0`;
    }
  } catch { void 0; }
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const session = getAuth();
  const headers = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
  };
  const res = await fetch(url, { cache: "no-store", ...init, headers });
  if (res.status === 401) {
    clearAuth();
    throw new Error("Unauthorized");
  }
  return res;
}
export async function updateMyProfileApi(patch: { name?: string; email?: string; phone?: string; shopName?: string; staffRole?: string; location?: string; lat?: number; lng?: number }): Promise<{ ok: boolean; user?: ApiUser }> {
  const endpoints = [
    "/api/users/me",
    "http://localhost:5000/api/users/me",
  ];
  let lastErr = "Failed to update profile";
  for (const url of endpoints) {
    try {
      const res = await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok && (data as { ok?: unknown })?.ok === true) {
        const u = (data as { user?: unknown }).user as Record<string, unknown> | undefined;
        if (u) {
          const mapped: ApiUser = {
            id: String((u.id ?? u._id ?? "")),
            name: String((u.name ?? "")),
            email: String((u.email ?? "")),
            role: String((u.role ?? "customer")).toLowerCase() as ApiUser["role"],
            phone: u.phone as string | undefined,
            shopName: u.shopName as string | undefined,
            staffRole: u.staffRole as string | undefined,
            location: u.location as { formatted?: string; lat?: number; lng?: number } | undefined,
          };
          return { ok: true, user: mapped };
        }
        return { ok: true };
      }
      lastErr =
        (data && typeof (data as { message?: unknown }).message === "string" && (data as { message: string }).message) ||
        `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

type CreateStaffInput = { role: "staff"; name: string; email: string; phone: string; staffRole: string; location: string; password: string };
type CreateMerchantInput = { role: "merchant"; shopName: string; email: string; phone: string; location: string; password: string };
export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "merchant" | "customer";
  phone?: string;
  shopName?: string;
  staffRole?: string;
  location?: { formatted?: string; lat?: number; lng?: number };
  staffOnline?: boolean;
  liveLocation?: { lat?: number; lng?: number; updatedAt?: string };
};
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

let usersCacheValue: ApiUser[] | null = null;
let usersCacheTime = 0;
let usersCachePromise: Promise<ApiUser[]> | null = null;
let currentUserCacheValue: ApiUser | null = null;
let currentUserCacheTime = 0;
let currentUserCachePromise: Promise<ApiUser | null> | null = null;
const USERS_TTL_MS = 30000;
const CURRENT_USER_TTL_MS = 30000;

export async function listUsersFromApi(): Promise<ApiUser[]> {
  const now = Date.now();
  if (usersCacheValue && now - usersCacheTime < USERS_TTL_MS) {
    return usersCacheValue;
  }
  if (usersCachePromise) {
    return usersCachePromise;
  }
  const session = getAuth();
  const endpoints = [
    "/api/users",
    "http://localhost:5000/api/users",
  ];
  let lastErr = "Failed to fetch users";
  const task = (async () => {
    for (const url of endpoints) {
      try {
        const res = await apiFetch(url);
        let data: unknown = null;
        let parsed = true;
        try {
          data = await res.json();
        } catch {
          parsed = false;
        }
        const obj = data as { users?: unknown };
        if (res.ok && obj && Array.isArray(obj.users)) {
          const arr = obj.users as unknown[];
          const mapped = arr.map((u) => {
            const r = u as Record<string, unknown>;
            return {
              id: String((r.id ?? r._id ?? "")),
              name: String((r.name ?? "")),
              email: String((r.email ?? "")),
              role: String((r.role ?? "customer")).toLowerCase() as ApiUser["role"],
              phone: r.phone as string | undefined,
              shopName: r.shopName as string | undefined,
              staffRole: r.staffRole as string | undefined,
              location: r.location as { formatted?: string; lat?: number; lng?: number } | undefined,
              staffOnline: typeof r.staffOnline === "boolean" ? (r.staffOnline as boolean) : undefined,
              liveLocation: r.liveLocation && typeof r.liveLocation === "object"
                ? {
                  lat: (r.liveLocation as Record<string, unknown>).lat as number | undefined,
                  lng: (r.liveLocation as Record<string, unknown>).lng as number | undefined,
                  updatedAt: (r.liveLocation as Record<string, unknown>).updatedAt ? String((r.liveLocation as Record<string, unknown>).updatedAt) : undefined,
                }
                : undefined,
            };
          });
          return mapped;
        }
        lastErr =
          (data && typeof data.message === "string" && data.message) ||
          `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "Network error";
      }
    }
    throw new Error(lastErr);
  })();
  usersCachePromise = task;
  try {
    const result = await task;
    usersCacheValue = result;
    usersCacheTime = Date.now();
    usersCachePromise = null;
    return result;
  } catch (e) {
    usersCachePromise = null;
    throw e;
  }
}

export async function getCurrentUserFromApi(): Promise<ApiUser | null> {
  const now = Date.now();
  if (currentUserCacheValue && now - currentUserCacheTime < CURRENT_USER_TTL_MS) {
    return currentUserCacheValue;
  }
  if (currentUserCachePromise) {
    return currentUserCachePromise;
  }
  const endpoints = [
    "/api/users/me",
    "http://localhost:5000/api/users/me",
  ];
  const task = (async () => {
    for (const url of endpoints) {
      try {
        const res = await apiFetch(url);
        let data: unknown = null;
        let parsed = true;
        try {
          data = await res.json();
        } catch {
          parsed = false;
        }
        const obj = data as { user?: unknown };
        if (res.ok && obj && obj.user && typeof obj.user === "object") {
          const r = obj.user as Record<string, unknown>;
          return {
            id: String((r.id ?? r._id ?? "")),
            name: String((r.name ?? "")),
            email: String((r.email ?? "")),
            role: String((r.role ?? "customer")).toLowerCase() as ApiUser["role"],
            phone: r.phone as string | undefined,
            shopName: r.shopName as string | undefined,
            staffRole: r.staffRole as string | undefined,
            location: r.location as { formatted?: string; lat?: number; lng?: number } | undefined,
            staffOnline: typeof r.staffOnline === "boolean" ? (r.staffOnline as boolean) : undefined,
            liveLocation: r.liveLocation && typeof r.liveLocation === "object"
              ? {
                lat: (r.liveLocation as Record<string, unknown>).lat as number | undefined,
                lng: (r.liveLocation as Record<string, unknown>).lng as number | undefined,
                updatedAt: (r.liveLocation as Record<string, unknown>).updatedAt ? String((r.liveLocation as Record<string, unknown>).updatedAt) : undefined,
              }
              : undefined,
          };
        }
        if (!res.ok && parsed && typeof (data as { message?: unknown }).message === "string") {
          const msg = (data as { message: string }).message;
          throw new Error(msg || "Failed to fetch current user");
        }
      } catch (_e) {
        /* ignore and try next endpoint */
      }
    }
    return null;
  })();
  currentUserCachePromise = task;
  try {
    const result = await task;
    currentUserCacheValue = result;
    currentUserCacheTime = Date.now();
    currentUserCachePromise = null;
    return result;
  } catch (e) {
    currentUserCachePromise = null;
    throw e;
  }
}

export async function deleteUserByAdmin(id: string): Promise<{ ok: boolean }> {
  const session = getAuth();
  const endpoints = [
    `/api/users/${encodeURIComponent(id)}`,
    `http://localhost:5000/api/users/${encodeURIComponent(id)}`,
  ];
  let lastErr = "Failed to delete user";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok && data && data.ok) {
        return { ok: true };
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

export type ApiBooking = {
  id: string;
  customerEmail: string;
  customerPhone?: string;
  vehicle: "car" | "bike";
  service: string;
  location?: { formatted?: string; lat?: number; lng?: number };
  date?: string;
  time?: string;
  registration?: string;
  status: string;
  merchantId?: string;
  staffId?: string;
  repairNotes?: string;
  photosBefore?: string[];
  photosAfter?: string[];
  photosReturn?: string[];
  beforeServicePhotos?: string[];
  afterServicePhotos?: string[];
  price?: number;
  billTotal?: number;
  estimateLabour?: number;
  estimateParts?: number;
  estimateAdditional?: number;
  estimateTotal?: number;
  payments?: { amount?: number; method?: string; reference?: string; byRole?: string; time?: string }[];
  ratingValue?: number;
  ratingComment?: string;
  dropAt?: string;
  dropByStaffId?: string;
  lastUpdatedByRole?: string;
  lastUpdatedMessage?: string;
  lastUpdatedAt?: string;
  staffAcceptanceStatus?: "none" | "pending" | "accepted" | "declined";
};

export async function createBookingApi(input: { customerEmail: string; customerPhone?: string; vehicle: "car" | "bike"; service: string; location?: string | { formatted?: string; lat?: number; lng?: number }; date?: string; time?: string; registration?: string }) {
  const endpoints = [
    "/api/bookings",
    "http://localhost:5000/api/bookings",
  ];
  let lastErr = "Failed to create booking";
  for (const url of endpoints) {
    try {
      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(input),
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      const obj = data as { booking?: { id?: unknown } };
      if (res.ok && obj && obj.booking && obj.booking.id) {
        bookingsCache = null;
        bookingsCachePromise = null;
        clearBookingsStorage();
        return String(obj.booking.id || "");
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

type BookingsCacheEntry = { key: string; at: number; value: ApiBooking[] };
let bookingsCache: BookingsCacheEntry | null = null;
let bookingsCachePromise: { key: string; promise: Promise<ApiBooking[]> } | null = null;
const BOOKINGS_TTL_MS = 0;
const BOOKINGS_STORAGE_KEY = "bookings_api_cache_v1";

function loadBookingsCacheFromStorage(expectedKey: string) {
  if (bookingsCache) return;
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    const raw = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as BookingsCacheEntry;
    if (!parsed || parsed.key !== expectedKey || !Array.isArray(parsed.value)) return;
    bookingsCache = { key: parsed.key, at: Date.now(), value: parsed.value };
  } catch {
    return;
  }
}

function saveBookingsCacheToStorage(entry: BookingsCacheEntry) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    return;
  }
}

function clearBookingsStorage() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.removeItem(BOOKINGS_STORAGE_KEY);
  } catch {
    return;
  }
}

export function getCachedApiBookings(params?: { email?: string; limit?: number }): ApiBooking[] {
  const qs = new URLSearchParams();
  const session = getAuth();
  const email = params?.email || session?.email;
  if (email) qs.set("email", email);
  if (session?.role) qs.set("role", session.role);
  const lim = params?.limit;
  if (typeof lim === "number" && Number.isFinite(lim) && lim > 0) {
    qs.set("limit", String(Math.min(Math.floor(lim), 200)));
  } else if (session?.role === "Admin") {
    qs.set("limit", "100");
  }
  const suffix = qs.toString();
  const key = suffix || "all";
  if (!bookingsCache || bookingsCache.key !== key) {
    loadBookingsCacheFromStorage(key);
  }
  if (bookingsCache && bookingsCache.key === key) {
    return bookingsCache.value;
  }
  return [];
}

export async function listApiBookings(params?: { id?: string; email?: string; limit?: number }): Promise<ApiBooking[]> {
  const qs = new URLSearchParams();
  const session = getAuth();
  const id = params?.id;
  if (id) qs.set("id", id);
  const email = params?.email || session?.email;
  if (email) qs.set("email", email.toLowerCase());
  if (session?.role) qs.set("role", session.role);
  const lim = params?.limit;
  if (typeof lim === "number" && Number.isFinite(lim) && lim > 0) {
    qs.set("limit", String(Math.min(Math.floor(lim), 200)));
  } else if (session?.role === "Admin") {
    qs.set("limit", "100");
  }
  const suffix = qs.toString();
  const key = suffix || "all";
  const now = Date.now();
  if (!bookingsCache) {
    loadBookingsCacheFromStorage(key);
  }
  if (BOOKINGS_TTL_MS > 0 && bookingsCache && bookingsCache.key === key && now - bookingsCache.at < BOOKINGS_TTL_MS) {
    return bookingsCache.value;
  }
  if (bookingsCachePromise && bookingsCachePromise.key === key) {
    return bookingsCachePromise.promise;
  }
  const endpoints = [
    `/api/bookings${suffix ? `?${suffix}` : ""}`,
    `http://localhost:5000/api/bookings${suffix ? `?${suffix}` : ""}`,
  ];
  let lastErr = "Failed to fetch bookings";
  const task = (async () => {
    for (const url of endpoints) {
      try {
        const res = await apiFetch(url);
        let data: unknown = null;
        let parsed = true;
        try {
          data = await res.json();
        } catch {
          parsed = false;
        }
        const obj = data as { bookings?: unknown };
        if (res.ok && obj && Array.isArray(obj.bookings)) {
          const arr = obj.bookings as unknown[];
          return arr.map((b) => {
            const r = b as Record<string, unknown>;
            const vehicleStr = String(r.vehicle ?? "car");
            const merchantVal = r.merchantId as unknown;
            const staffVal = r.staffId as unknown;
            const merchantId =
              typeof merchantVal === "string"
                ? merchantVal
                : merchantVal && typeof (merchantVal as { toString?: () => string }).toString === "function"
                  ? String((merchantVal as { toString: () => string }).toString())
                  : (merchantVal && typeof (merchantVal as Record<string, unknown>)._id === "string"
                    ? ((merchantVal as Record<string, unknown>)._id as string)
                    : undefined);
            const staffId =
              typeof staffVal === "string"
                ? staffVal
                : staffVal && typeof (staffVal as { toString?: () => string }).toString === "function"
                  ? String((staffVal as { toString: () => string }).toString())
                  : (staffVal && typeof (staffVal as Record<string, unknown>)._id === "string"
                    ? ((staffVal as Record<string, unknown>)._id as string)
                    : undefined);
            const payments = Array.isArray((r as Record<string, unknown>).payments)
              ? ((r as Record<string, unknown>).payments as unknown[]).map((p) => {
                const q = p as Record<string, unknown>;
                return {
                  amount: typeof q.amount === "number" ? (q.amount as number) : undefined,
                  method: typeof q.method === "string" ? (q.method as string) : undefined,
                  reference: typeof q.reference === "string" ? (q.reference as string) : undefined,
                  byRole: typeof q.byRole === "string" ? (q.byRole as string) : undefined,
                  time: q.time ? String(q.time) : undefined,
                };
              })
              : undefined;
            return {
              id: String((r.id ?? r._id ?? "")),
              customerEmail: String((r.customerEmail ?? "")),
              customerPhone: r.customerPhone as string | undefined,
              vehicle: (vehicleStr === "bike" ? "bike" : "car") as "car" | "bike",
              service: String((r.service ?? "")),
              location: r.location as { formatted?: string; lat?: number; lng?: number } | undefined,
              date: r.date as string | undefined,
              time: r.time as string | undefined,
              registration: r.registration as string | undefined,
              status: String((r.status ?? "")),
              merchantId,
              staffId,
              repairNotes: r.repairNotes as string | undefined,
              photosBefore: r.photosBefore as string[] | undefined,
              photosAfter: r.photosAfter as string[] | undefined,
              photosReturn: (r as Record<string, unknown>).photosReturn as string[] | undefined,
              beforeServicePhotos: (r as Record<string, unknown>).beforeServicePhotos as string[] | undefined,
              afterServicePhotos: (r as Record<string, unknown>).afterServicePhotos as string[] | undefined,
              price: typeof r.price === "number" ? (r.price as number) : undefined,
              billTotal: ((): number | undefined => {
                const v = (r as Record<string, unknown>).billTotal;
                return typeof v === "number" ? v : undefined;
              })(),
              dropAt: ((): string | undefined => {
                const v = (r as Record<string, unknown>).dropAt;
                return v ? String(v) : undefined;
              })(),
              dropByStaffId: ((): string | undefined => {
                const v = (r as Record<string, unknown>).dropByStaffId;
                if (typeof v === "string") return v;
                if (v && typeof (v as { toString?: () => string }).toString === "function") {
                  return String((v as { toString: () => string }).toString());
                }
                if (v && typeof (v as Record<string, unknown>)._id === "string") {
                  return (v as Record<string, unknown>)._id as string;
                }
                return undefined;
              })(),
              estimateLabour: ((): number | undefined => {
                const v = (r as Record<string, unknown>).estimateLabour ?? (r as Record<string, unknown>).labour_cost;
                return typeof v === "number" ? v : undefined;
              })(),
              estimateParts: ((): number | undefined => {
                const v = (r as Record<string, unknown>).estimateParts ?? (r as Record<string, unknown>).parts_cost;
                return typeof v === "number" ? v : undefined;
              })(),
              estimateAdditional: ((): number | undefined => {
                const v = (r as Record<string, unknown>).estimateAdditional ?? (r as Record<string, unknown>).additional_work;
                return typeof v === "number" ? v : undefined;
              })(),
              estimateTotal: ((): number | undefined => {
                const v = (r as Record<string, unknown>).estimateTotal;
                if (typeof v === "number") return v;
                const l = (r as Record<string, unknown>).labour_cost;
                const p = (r as Record<string, unknown>).parts_cost;
                const a = (r as Record<string, unknown>).additional_work;
                const sum = [l, p, a].map((x) => (typeof x === "number" ? x : 0)).reduce((s, n) => s + n, 0);
                return sum > 0 ? sum : undefined;
              })(),
              ratingValue: ((): number | undefined => {
                const v = (r as Record<string, unknown>).ratingValue;
                return typeof v === "number" ? v : undefined;
              })(),
              ratingComment: ((): string | undefined => {
                const v = (r as Record<string, unknown>).ratingComment;
                return typeof v === "string" ? v : undefined;
              })(),
              lastUpdatedByRole: typeof r.lastUpdatedByRole === "string" ? (r.lastUpdatedByRole as string) : undefined,
              lastUpdatedMessage: typeof r.lastUpdatedMessage === "string" ? (r.lastUpdatedMessage as string) : undefined,
              lastUpdatedAt: r.lastUpdatedAt ? String(r.lastUpdatedAt) : undefined,
              staffAcceptanceStatus:
                typeof r.staffAcceptanceStatus === "string" &&
                  (["none", "pending", "accepted", "declined"] as const).includes(
                    String(r.staffAcceptanceStatus) as "none" | "pending" | "accepted" | "declined"
                  )
                  ? (String(r.staffAcceptanceStatus) as "none" | "pending" | "accepted" | "declined")
                  : undefined,
              payments,
            };
          });
        }
        lastErr =
          (data && typeof data.message === "string" && data.message) ||
          `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "Network error";
      }
    }
    throw new Error(lastErr);
  })();
  const entry = { key, promise: task };
  bookingsCachePromise = entry;
  try {
    const result = await task;
    bookingsCache = { key, at: Date.now(), value: result };
    saveBookingsCacheToStorage(bookingsCache);
    bookingsCachePromise = null;
    return result;
  } catch (e) {
    bookingsCachePromise = null;
    throw e;
  }
}

export async function patchBookingApi(id: string, payload: Record<string, unknown>): Promise<void> {
  const session = getAuth();
  const endpoints = [
    `/api/bookings/${encodeURIComponent(id)}`,
    `http://localhost:5000/api/bookings/${encodeURIComponent(id)}`,
  ];
  let lastErr = "Failed to update booking";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok && data && data.ok) {
        bookingsCache = null;
        bookingsCachePromise = null;
        clearBookingsStorage();
        return;
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
export async function deleteApiBooking(id: string): Promise<{ ok: boolean }> {
  const session = getAuth();
  const endpoints = [
    `/api/bookings/${encodeURIComponent(id)}`,
    `http://localhost:5000/api/bookings/${encodeURIComponent(id)}`,
  ];
  let lastErr = "Failed to delete booking";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok && data && (data as Record<string, unknown>).ok) {
        return { ok: true };
      }
      lastErr =
        (data && typeof (data as Record<string, unknown>).message === "string" && (data as Record<string, unknown>).message as string) ||
        `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export type AdminDashboardStats = {
  totalUsers: number;
  activeBookings: number;
  revenue: number;
  onlineStaffCount: number;
  updatedAt?: string;
};
let adminStatsCache: AdminDashboardStats | null = null;
let adminStatsCacheTime = 0;
let adminStatsPromise: Promise<AdminDashboardStats> | null = null;
let merchantStatsCache: MerchantDashboardStats | null = null;
let merchantStatsCacheTime = 0;
let merchantStatsPromise: Promise<MerchantDashboardStats> | null = null;
const DASHBOARD_STATS_TTL_MS = 10000;
const ADMIN_STATS_STORAGE_KEY = "admin_dashboard_stats_v1";
const MERCHANT_STATS_STORAGE_KEY = "merchant_dashboard_stats_v1";

function loadAdminStatsFromStorage() {
  if (adminStatsCache) return;
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    const raw = window.localStorage.getItem(ADMIN_STATS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as AdminDashboardStats & { cachedAt?: number };
    if (!parsed || typeof parsed.totalUsers !== "number") return;
    adminStatsCache = {
      totalUsers: parsed.totalUsers,
      activeBookings: parsed.activeBookings,
      revenue: parsed.revenue,
      onlineStaffCount: parsed.onlineStaffCount,
      updatedAt: parsed.updatedAt,
    };
    adminStatsCacheTime = parsed.cachedAt || Date.now();
  } catch {
    return;
  }
}

function saveAdminStatsToStorage(stats: AdminDashboardStats) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    const payload = { ...stats, cachedAt: Date.now() };
    window.localStorage.setItem(ADMIN_STATS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

function loadMerchantStatsFromStorage() {
  if (merchantStatsCache) return;
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    const raw = window.localStorage.getItem(MERCHANT_STATS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as MerchantDashboardStats & { cachedAt?: number };
    if (!parsed || typeof parsed.totalBookings !== "number") return;
    merchantStatsCache = {
      activeServices: parsed.activeServices,
      totalBookings: parsed.totalBookings,
      earnings: parsed.earnings,
      ratingAvg: parsed.ratingAvg,
      ratingCount: parsed.ratingCount,
      updatedAt: parsed.updatedAt,
    };
    merchantStatsCacheTime = parsed.cachedAt || Date.now();
  } catch {
    return;
  }
}

function saveMerchantStatsToStorage(stats: MerchantDashboardStats) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    const payload = { ...stats, cachedAt: Date.now() };
    window.localStorage.setItem(MERCHANT_STATS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = Date.now();
  if (!adminStatsCache) {
    loadAdminStatsFromStorage();
  }
  if (adminStatsCache && now - adminStatsCacheTime < DASHBOARD_STATS_TTL_MS) {
    return adminStatsCache;
  }
  if (adminStatsPromise) {
    return adminStatsPromise;
  }
  const endpoints = ['/api/dashboard/admin', 'http://localhost:5000/api/dashboard/admin'];
  let lastErr = 'Failed to fetch admin dashboard stats';
  const task = (async () => {
    for (const url of endpoints) {
      try {
        const res = await apiFetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.ok && data.stats) {
          return { ...data.stats, updatedAt: data.updatedAt } as AdminDashboardStats;
        }
        lastErr =
          (data && typeof data.message === 'string' && data.message) ||
          `HTTP ${res.status}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Network error';
      }
    }
    throw new Error(lastErr);
  })();
  adminStatsPromise = task;
  try {
    const result = await task;
    adminStatsCache = result;
    adminStatsCacheTime = Date.now();
    saveAdminStatsToStorage(result);
    adminStatsPromise = null;
    return result;
  } catch (e) {
    adminStatsPromise = null;
    throw e;
  }
}

export type MerchantDashboardStats = {
  activeServices: number;
  totalBookings: number;
  earnings: number;
  ratingAvg: number | null;
  ratingCount: number;
  updatedAt?: string;
};
export async function getMerchantDashboardStats(): Promise<MerchantDashboardStats> {
  const now = Date.now();
  if (!merchantStatsCache) {
    loadMerchantStatsFromStorage();
  }
  if (merchantStatsCache && now - merchantStatsCacheTime < DASHBOARD_STATS_TTL_MS) {
    return merchantStatsCache;
  }
  if (merchantStatsPromise) {
    return merchantStatsPromise;
  }
  const endpoints = ['/api/dashboard/merchant', 'http://localhost:5000/api/dashboard/merchant'];
  let lastErr = 'Failed to fetch merchant dashboard stats';
  const task = (async () => {
    for (const url of endpoints) {
      try {
        const res = await apiFetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.ok && data.stats) {
          return { ...data.stats, updatedAt: data.updatedAt } as MerchantDashboardStats;
        }
        lastErr =
          (data && typeof data.message === 'string' && data.message) ||
          `HTTP ${res.status}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Network error';
      }
    }
    throw new Error(lastErr);
  })();
  merchantStatsPromise = task;
  try {
    const result = await task;
    merchantStatsCache = result;
    merchantStatsCacheTime = Date.now();
    saveMerchantStatsToStorage(result);
    merchantStatsPromise = null;
    return result;
  } catch (e) {
    merchantStatsPromise = null;
    throw e;
  }
}
export async function setStaffOnlineApi(online: boolean): Promise<{ ok: boolean; online: boolean }> {
  const session = getAuth();
  const endpoints = [
    `/api/users/me/online`,
    `http://localhost:5000/api/users/me/online`,
  ];
  let lastErr = "Failed to update status";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({ online }),
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok) {
        const obj = (data ?? {}) as { ok?: unknown; online?: unknown; message?: unknown };
        if (obj && obj.ok === true) {
          return { ok: true, online: Boolean(obj.online) };
        }
      }
      lastErr =
        (data && typeof (data as { message?: unknown }).message === "string" && (data as { message: string }).message) ||
        `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}
export async function setStaffLocationApi(lat: number, lng: number): Promise<{ ok: boolean }> {
  const session = getAuth();
  const endpoints = [
    `/api/users/me/location`,
    `http://localhost:5000/api/users/me/location`,
  ];
  let lastErr = "Failed to update location";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({ lat, lng }),
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok && (data as { ok?: unknown })?.ok === true) {
        return { ok: true };
      }
      lastErr =
        (data && typeof (data as { message?: unknown }).message === "string" && (data as { message: string }).message) ||
        `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}
export async function updateUserLocationByAdmin(id: string, lat: number, lng: number): Promise<{ ok: boolean }> {
  const session = getAuth();
  const endpoints = [
    `/api/users/${id}/location`,
    `http://localhost:5000/api/users/${id}/location`,
  ];
  let lastErr = "Failed to update location";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({ lat, lng }),
      });
      let data: unknown = null;
      let parsed = true;
      try { data = await res.json(); } catch { parsed = false; }
      if (res.ok && (data as { ok?: unknown })?.ok === true) {
        return { ok: true };
      }
      lastErr =
        (data && typeof (data as { message?: unknown }).message === "string" && (data as { message: string }).message) ||
        `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
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

export async function listCustomerVehiclesFromApi(ownerEmail: string): Promise<CustomerVehicle[]> {
  const qs = new URLSearchParams({ email: ownerEmail });
  const endpoints = [
    `/api/users/vehicles?${qs.toString()}`,
    `http://localhost:5000/api/users/vehicles?${qs.toString()}`,
  ];
  let lastErr = "Failed to fetch vehicles";
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      const obj = data as { vehicles?: unknown };
      if (res.ok && obj && Array.isArray(obj.vehicles)) {
        const arr = obj.vehicles as unknown[];
        return arr.map((v) => {
          const r = v as Record<string, unknown>;
          return {
            id: String((r.id ?? r._id) ?? ""),
            ownerEmail: String((r.ownerEmail ?? ownerEmail) ?? ""),
            type: (String(r.type ?? "car") === "bike" ? "bike" : "car") as VehicleType,
            make: String(r.make ?? ""),
            model: String(r.model ?? ""),
            year: typeof r.year === "string" ? r.year : "",
            engine: typeof r.engine === "string" ? r.engine : undefined,
            displacement: typeof r.displacement === "string" ? r.displacement : undefined,
            power_hp: typeof r.power_hp === "string" ? r.power_hp : undefined,
            vin: typeof r.vin === "string" ? r.vin : undefined,
            plate: typeof r.plate === "string" ? r.plate : undefined,
            createdAt: String(r.createdAt ?? ""),
          };
        });
      }
      {
        const msg = (data as { message?: unknown })?.message;
        lastErr = typeof msg === "string" ? msg : `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export async function createCustomerVehicleApi(input: { ownerEmail: string; type: VehicleType; make?: string; model?: string; year?: string; engine?: string; displacement?: string; power_hp?: string; vin?: string; plate: string }) {
  const endpoints = [
    `/api/users/vehicles`,
    `http://localhost:5000/api/users/vehicles`,
  ];
  let lastErr = "Failed to save vehicle";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      const obj = data as { vehicle?: { id?: unknown } };
      if (res.ok && obj && obj.vehicle && obj.vehicle.id) {
        return String(obj.vehicle.id || "");
      }
      {
        const msg = (data as { message?: unknown })?.message;
        lastErr = typeof msg === "string" ? msg : `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export async function deleteCustomerVehicleFromApi(id: string, ownerEmail: string) {
  const qs = new URLSearchParams();
  if (ownerEmail) qs.set("email", ownerEmail);
  const suffix = qs.toString();
  const endpoints = [
    `/api/users/vehicles/${encodeURIComponent(id)}${suffix ? `?${suffix}` : ""}`,
    `http://localhost:5000/api/users/vehicles/${encodeURIComponent(id)}${suffix ? `?${suffix}` : ""}`,
  ];
  let lastErr = "Failed to delete vehicle";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "DELETE" });
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      if (res.ok) {
        return;
      }
      {
        const msg = (data as { message?: unknown })?.message;
        lastErr = typeof msg === "string" ? msg : `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
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
      let data: unknown = null;
      let parsed = true;
      try {
        data = await res.json();
      } catch {
        parsed = false;
      }
      const obj = data as { vehicle?: unknown };
      if (res.ok && obj && obj.vehicle && typeof obj.vehicle === "object") {
        return obj.vehicle as { make?: string; model?: string; year?: string; engine?: string; displacement?: string; power_hp?: string; type?: string; registration?: string };
      }
      lastErr =
        (data && typeof data.message === "string" && data.message) ||
        `HTTP ${res.status}${parsed ? "" : " (invalid JSON)"}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  return { type: input.type, registration: input.reg };
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

export async function listServicesApi(vehicle?: VehicleType): Promise<ServiceItem[]> {
  const session = getAuth();
  const endpoints = [
    `/api/services?vehicleType=${vehicle || ""}`,
    `http://localhost:5000/api/services?vehicleType=${vehicle || ""}`,
  ];
  let lastErr = "Failed to fetch services";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.services)) {
        return data.services.map((s: any) => ({
          id: s._id,
          title: s.title,
          desc: s.desc,
          price: s.price,
          vehicle: s.vehicleType,
          active: s.isActive,
        }));
      }
      lastErr = data.message || `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export async function createServiceApi(entry: Omit<ServiceItem, "id" | "active">): Promise<void> {
  const session = getAuth();
  const endpoints = [
    "/api/services",
    "http://localhost:5000/api/services",
  ];
  let lastErr = "Failed to create service";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({
          title: entry.title,
          desc: entry.desc,
          price: entry.price,
          vehicleType: entry.vehicle,
        }),
      });
      const data = await res.json();
      if (res.ok) return;
      lastErr = data.message || `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export async function updateServiceApi(id: string, patch: Partial<Omit<ServiceItem, "id" | "active">>): Promise<void> {
  const session = getAuth();
  const endpoints = [
    `/api/services/${encodeURIComponent(id)}`,
    `http://localhost:5000/api/services/${encodeURIComponent(id)}`,
  ];
  let lastErr = "Failed to update service";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({
          ...(patch.title ? { title: patch.title } : {}),
          ...(patch.desc ? { desc: patch.desc } : {}),
          ...(patch.price ? { price: patch.price } : {}),
          ...(patch.vehicle ? { vehicleType: patch.vehicle } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) return;
      lastErr = data.message || `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
}

export async function deleteServiceApi(id: string): Promise<void> {
  const session = getAuth();
  const endpoints = [
    `/api/services/${encodeURIComponent(id)}`,
    `http://localhost:5000/api/services/${encodeURIComponent(id)}`,
  ];
  let lastErr = "Failed to delete service";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok) return;
      lastErr = data.message || `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network error";
    }
  }
  throw new Error(lastErr);
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

export function downloadInvoice(inv: Invoice, booking?: { service?: string; date?: string }) {
  const b = findBooking(inv.bookingId);
  const svc = booking?.service || b?.service || "-";
  const dt = booking?.date || b?.date || "-";
  const amount = Number(inv.amount || 0).toLocaleString("en-IN");
  const now = new Date();
  const dateStr = now.toLocaleString();
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><title>' +
    inv.invoiceNo +
    '</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111}h1{margin:0 0 8px 0}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ddd;padding:8px;text-align:left}small{color:#666}</style></head><body>' +
    '<h1>MotoHub Invoice</h1>' +
    '<div><strong>Invoice No:</strong> ' +
    inv.invoiceNo +
    '</div><div><strong>Date:</strong> ' +
    dateStr +
    '</div><div><strong>Status:</strong> ' +
    inv.status +
    '</div><div style="margin-top:8px"><strong>Billed To:</strong> ' +
    inv.customerEmail +
    "</div>" +
    "<table><thead><tr><th>Booking</th><th>Service</th><th>Date</th><th>Amount</th></tr></thead><tbody>" +
    "<tr><td>" +
    inv.bookingId +
    "</td><td>" +
    svc +
    "</td><td>" +
    dt +
    "</td><td>₹" +
    amount +
    "</td></tr></tbody></table>" +
    "<p><small>This is a system generated invoice.</small></p>" +
    "</body></html>";
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.invoiceNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface NotificationEntry {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
}

const NOTIFICATIONS_KEY = "notifications";

function readNotifications(): NotificationEntry[] {
  const raw = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NotificationEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(items: NotificationEntry[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
}

export function addNotificationForUser(userId: string, title: string, message: string) {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const items = readNotifications();
  items.push({ id, userId, title, message, date });
  writeNotifications(items);
}

export function listNotificationsForUser(userId: string): NotificationEntry[] {
  return readNotifications().filter((n) => n.userId === userId);
}

export function clearNotificationsForUser(userId: string) {
  const items = readNotifications().filter((n) => n.userId !== userId);
  writeNotifications(items);
}
