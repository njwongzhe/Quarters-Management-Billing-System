export type BayaranHistoryItem = {
  id: string;
  paymentNo: string;
  paymentDate: string;
  receiptNo: string;
  description: string;
  amount: number;
  sourceFile: string | null;
};

export type BayaranDetailData = {
  profile: {
    residentId: string;
    fullName: string;
    icNumber: string;
    age: string;
    kelas: string;
    unit: string;
    moveInDate: string | null;
    moveOutDate: string | null;
    status: string;
  };
  currentPayment: BayaranHistoryItem & {
    currentArrears: number;
    paymentStatus: string;
  };
  uploadedHistory: BayaranHistoryItem[];
  manualPayments: BayaranHistoryItem[];
};

export type BayaranDetailResponse = {
  ok: boolean;
  message?: string;
  data?: BayaranDetailData;
};
