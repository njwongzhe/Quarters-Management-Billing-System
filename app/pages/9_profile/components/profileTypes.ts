export type AdminProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  department: string | null;
  gender: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Feedback = {
  type: "success" | "error";
  message: string;
};

export type ProfileForm = {
  fullName: string;
  phoneNumber: string;
  department: string;
  gender: string;
};

export type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
