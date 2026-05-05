import type { 
  Resident, 
  QuarterCategory, 
  Unit, 
  Transaction,
  MonthlyCharge,
  AdditionalCharge,
  Rebate,
  UnitOccupancy
} from "@prisma/client";

// --- TYPES ---

export type TunggakanListItem = {
  id: string; // Resident ID
  fullName: string;
  icNumber: string;
  quarterClass: string; // e.g., "PPR Kempas"
  unitCode: string;     // e.g., "Blok B-04-12"
  sewa: number;
  senggara: number;
  penalti: number;
  tambahan: number;
  rebat: number;
  jumlahTunggakan: number;
};

export type TunggakanSummary = {
  jumlahRekod: number; // Total Historical Charges (Debits)
  jumlahTunggakan: number; // Live Current Outstanding Debt
};

export type TunggakanHistoryItem = {
  id: string; // Transaction ID
  tarikh: string; // ISO Date string
  kategori: string; // e.g., "Caj Sewa", "Rebat"
  catatan: string; // e.g., "Kos Perapian Taman"
  debit: number;
  kredit: number;
};

export type ResidentTunggakanDetails = {
  id: string;
  fullName: string;
  icNumber: string;
  age: number;
  quarterClass: string;
  unitCode: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  status: string;
  charges: {
      sewa: number;
      senggara: number;
      penalti: number;
      tambahan: number;
      rebat: number;
      jumlahTunggakan: number;
  }
};

// --- API INPUT VALIDATION TYPES ---

export type TambahanChargeInput = {
  tarikh: string;
  catatan: string;
  amaun: number;
};

export type RebatInput = {
  tarikh: string;
  catatan: string;
  amaun: number;
};

export type BulkUpdateTunggakanInput = {
  residentIds: string[];
  cajSenggaraEnabled: boolean;
  cajTambahan: TambahanChargeInput[];
  rebat: RebatInput[];
};

type ParseSuccess<T> = {
  ok: true;
  data: T;
};

type ParseFailure = {
  ok: false;
  message: string;
};

// --- HELPER FUNCTIONS ---

export function mapTunggakanForApi(
  resident: Resident & {
      occupancies: (UnitOccupancy & { unit: Unit & { quarterCategory: QuarterCategory } })[];
      monthlyCharges: (MonthlyCharge & { additionalCharges: AdditionalCharge[], rebates: Rebate[] })[];
  }
): TunggakanListItem {
  
  const activeOccupancy = resident.occupancies.find(o => o.status === "CURRENT");
  const quarterClass = activeOccupancy?.unit.quarterCategory?.categoryName || "Tiada";
  const unitCode = activeOccupancy?.unit.unitCode || "Tiada";

  let sewa = 0;
  let senggara = 0;
  let penalti = 0;
  let tambahan = 0;
  let rebat = 0;
  let bayaran = 0; // <-- 1. ADD THIS VARIABLE TO TRACK PAYMENTS

  resident.monthlyCharges.forEach(charge => {
      sewa += Number(charge.rentalAmount);
      senggara += Number(charge.maintenanceAmount);
      penalti += Number(charge.penaltyAmount);
      bayaran += Number(charge.paymentReceived); // <-- 2. ADD UP ALL PAYMENTS RECEIVED
      
      charge.additionalCharges.forEach(add => { tambahan += Number(add.amount) });
      charge.rebates.forEach(r => { rebat += Number(r.amount) });
  });

  // 3. SUBTRACT PAYMENTS FROM THE FINAL CALCULATION
  const jumlahTunggakan = (sewa + senggara + penalti + tambahan) - rebat - bayaran;

  return {
      id: resident.id,
      fullName: resident.fullName,
      icNumber: resident.icNumber,
      quarterClass,
      unitCode,
      sewa: Number(sewa.toFixed(2)),
      senggara: Number(senggara.toFixed(2)),
      penalti: Number(penalti.toFixed(2)),
      tambahan: Number(tambahan.toFixed(2)),
      rebat: Number(rebat.toFixed(2)),
      jumlahTunggakan: Number(jumlahTunggakan.toFixed(2)),
  };
}

// --- PARSING & VALIDATION FUNCTIONS ---

export function parseBulkUpdateBody(
  body: unknown
): ParseSuccess<BulkUpdateTunggakanInput> | ParseFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { ok: false, message: "Data permintaan tidak sah." };
  }

  const payload = body as Record<string, unknown>;

  // 1. Validate Resident IDs
  if (!Array.isArray(payload.residentIds) || payload.residentIds.length === 0) {
      return { ok: false, message: "Sila pilih sekurang-kurangnya seorang penghuni." };
  }
  const residentIds = payload.residentIds.map(String);

  // 2. Validate Senggara Toggle
  const cajSenggaraEnabled = Boolean(payload.cajSenggaraEnabled);

  // 3. Validate Tambahan Charges array
  const cajTambahan: TambahanChargeInput[] = [];
  if (Array.isArray(payload.cajTambahan)) {
      for (const item of payload.cajTambahan) {
          const parsedItem = parseChargeItem(item, "Caj Tambahan");
          if (!parsedItem.ok) return parsedItem;
          cajTambahan.push(parsedItem.data);
      }
  }

  // 4. Validate Rebat array
  const rebat: RebatInput[] = [];
  if (Array.isArray(payload.rebat)) {
      for (const item of payload.rebat) {
          const parsedItem = parseChargeItem(item, "Rebat");
          if (!parsedItem.ok) return parsedItem;
          rebat.push(parsedItem.data);
      }
  }

  return {
      ok: true,
      data: {
          residentIds,
          cajSenggaraEnabled,
          cajTambahan,
          rebat
      }
  };
}

function parseChargeItem(item: unknown, label: string): ParseSuccess<TambahanChargeInput> | ParseFailure {
  if (!item || typeof item !== "object") {
      return { ok: false, message: `Format ${label} tidak sah.` };
  }
  const data = item as Record<string, unknown>;

  if (typeof data.tarikh !== "string" || isNaN(Date.parse(data.tarikh))) {
      return { ok: false, message: `Tarikh untuk ${label} tidak sah.` };
  }

  if (typeof data.catatan !== "string" || data.catatan.trim().length === 0) {
      return { ok: false, message: `Catatan untuk ${label} wajib diisi.` };
  }

  const parsedAmount = parseMoneyInput(data.amaun, label);
  if (!parsedAmount.ok) return parsedAmount;

  return {
      ok: true,
      data: {
          tarikh: data.tarikh,
          catatan: data.catatan.trim(),
          amaun: parsedAmount.data
      }
  };
}

function parseMoneyInput(value: unknown, label: string): ParseSuccess<number> | ParseFailure {
  if (typeof value !== "string" && typeof value !== "number") {
      return { ok: false, message: `Nilai ${label} mesti dalam bentuk nombor.` };
  }
  const normalizedValue = String(value).trim();
  if (normalizedValue.length === 0) {
      return { ok: false, message: `Nilai ${label} tidak boleh kosong.` };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
      return { ok: false, message: `Nilai ${label} mesti nombor maksimum 2 tempat perpuluhan.` };
  }
  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return { ok: false, message: `Nilai ${label} mesti nombor positif.` };
  }
  return { ok: true, data: Number(parsedValue.toFixed(2)) };
}

// --- FILTER TYPES ---

export type TunggakanFilter = {
  kelasKuarters: string[];
  blok: string[];
  julatMin: string;
  julatMax: string;
  statusBayaran: string;
  mempunyaiPenalti: boolean;
  mempunyaiRebat: boolean;
};

export const defaultFilter: TunggakanFilter = {
  kelasKuarters: [],
  blok: [],
  julatMin: "",
  julatMax: "",
  statusBayaran: "SEMUA",
  mempunyaiPenalti: false,
  mempunyaiRebat: false,
};