export type BayaranStatusFilter = "cukup" | "kurang" | "lebih" | "tidak-lengkap";

export type PaymentStatus = "green" | "red" | "blue" | "purple";

export type BayaranFilters = {
  query: string;
  statuses: BayaranStatusFilter[];
  statusMode: boolean;
};

export type BayaranRow = {
  id: string;
  residentId: string | null;
  name: string;
  ic: string;
  quarters: string;
  unit: string;
  arrears: string;
  amount: string;
  tone: PaymentStatus;
  paymentStatus: BayaranStatusFilter;
  searchText: string;
};

export type BayaranPaymentHistoryRow = {
  id: string;
  date: string;
  receiptNo: string | null;
  description: string | null;
  amount: number;
};

export type BayaranDetail = {
  id: string;
  resident: {
    id: string;
    name: string;
    ic: string;
    age: number | null;
    status: string;
    statusLabel: string;
  };
  quarters: {
    categoryId: string | null;
    unitId: string | null;
    categoryName: string;
    unitCode: string;
    address: string | null;
    moveInDate: string | null;
    moveOutDate: string | null;
  };
  payment: {
    amountThisMonth: number;
    arrearsAmount: number | null;
    status: BayaranStatusFilter;
    statusLabel: string;
  };
  historyLoaded: boolean;
  history: BayaranPaymentHistoryRow[];
};

export type PaymentQueryRow = {
  id: string;
  residentId: string | null;
  fullName: string | null;
  icNumber: string | null;
  residentStatus: string | null;
  categoryName: string | null;
  categoryAddress: string | null;
  unitCode: string | null;
  extractedName: string | null;
  extractedIcNumber: string | null;
  extractedKuarters: string | null;
  extractedUnit: string | null;
  totalArrearsAmount: unknown;
  amount: unknown;
};

export type PaymentStatsQueryRow = {
  total: bigint;
  cukup: bigint;
  kurang: bigint;
  lebih: bigint;
  tidakLengkap: bigint;
};

export type BayaranStatCard = {
  label: string;
  helper: string;
  icon: string;
  accent: string;
  dot: string;
  helperColor: string;
  value: string;
};

export type BayaranPaginationItem = number | "ellipsis";

export type BayaranExportRow = {
  name: string;
  ic: string;
  quarters: string;
  unit: string;
  arrearsAmount: number | null;
  amount: number;
  status: string;
  paymentStatus: BayaranStatusFilter;
  searchText: string;
};
