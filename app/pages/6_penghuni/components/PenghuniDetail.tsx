"use client";

import Icon from "@/app/components/Icon";
import { useState } from "react";
import { calculateAgeByIc } from "@/app/utils/resident";
import type { ResidentRecord } from "../page";
import { InputField, InputFieldFormat, InputBox, DropdownField, type DropdownOption } from "./InputField";


function Topic({ content, className }: { content: string, className?: string }) {
    return (
        <span className={`border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest ${className || ""}`}>{content}</span>
    );
}

type PenghuniDetailWithCloseProps = ResidentRecord & {
    onClose?: () => void;
    onSaveSuccess?: (updatedData: Partial<ResidentRecord>) => void;
    onDeleteSuccess?: (residentId: string) => void;
};

type NotificationState = {
    type: "success" | "error" | null;
    message: string;
};

function getResidentApiErrorMessage(errorData: any, fallbackMessage: string) {
    switch (errorData?.errorCode) {
        case "RESIDENT_IC_EXISTS":
            return "No. KP ini sudah wujud dalam sistem.";
        case "RESIDENT_NOT_FOUND":
            return "Penghuni tidak ditemui.";
        case "DELETE_CONFLICT":
            return "Penghuni ini tidak boleh dipadam kerana masih dirujuk oleh data lain.";
        case "VALIDATION_ERROR":
            return errorData?.message ?? fallbackMessage;
        case "CREATE_FAILED":
        case "UPDATE_FAILED":
        case "DELETE_FAILED":
        case "READ_FAILED":
            return errorData?.message ?? fallbackMessage;
        default:
            return errorData?.message ?? fallbackMessage;
    }
}

function stripUploadFormatting(value: string | null | undefined) {
    return String(value ?? "").replace(/[\s-]/g, "");
}

function getArrearsTextClass(amount: number) {
    if (amount < 0) {
        return "text-green";
    }

    if (amount > 0) {
        return "text-red";
    }

    return "";
}

export default function PenghuniDetail(props?: PenghuniDetailWithCloseProps) {
    const [tab, setTab] = useState<"info" | "history">("info");
    const tarafPerkhidmatanOptions: DropdownOption[] = [
        { label: "Persekutuan" },
        { label: "Negeri" }
    ];
    const statusOptions: DropdownOption[] = [
        { label: "Aktif", color: "text-aktif" },
        { label: "Tidak Layak", color: "text-x-layak" },
        { label: "Pencen Mendatang", color: "text-pencen-datang" },
        { label: "Data Tidak Lengkap", color: "text-x-lengkap" },
        { label: "Keluar", color: "text-keluar" }
    ];

    const [kemasKini, setKemasKini] = useState(false);
    const inputState = kemasKini ? "active" : "inactive";
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState<NotificationState>({ type: null, message: "" });
    const isInactive = inputState === "inactive";

    const displayValue = (value: string | null | undefined) => {
        if (value == null || value === "") {
            return isInactive ? "N/A" : "";
        }

        return value;
    };

    // Original data from database. (Backup for cancel operations.)
    const [originalData, setOriginalData] = useState<ResidentRecord>({
        id: props?.id ?? "",
        fullName: props?.fullName ?? "",
        icNumber: props?.icNumber ?? "",
        phone: props?.phone ?? "",
        email: props?.email ?? "",
        position: props?.position ?? "",
        department: props?.department ?? "",
        serviceLevel: (props?.serviceLevel ?? "") as any,
        status: (props?.status ?? "AKTIF") as any,
        description: props?.description ?? "",
        updatedAt: props?.updatedAt ?? "",
        quarters: props?.quarters ?? null,
        totalArrearsAmount: props?.totalArrearsAmount ?? null,
    });

    // Form state for editing. (Starts with original data.)
    const [formData, setFormData] = useState<ResidentRecord>({
        id: props?.id ?? "",
        fullName: props?.fullName ?? "",
        icNumber: props?.icNumber ?? "",
        phone: props?.phone ?? "",
        email: props?.email ?? "",
        position: props?.position ?? "",
        department: props?.department ?? "",
        serviceLevel: (props?.serviceLevel ?? "") as any,
        status: (props?.status ?? "AKTIF") as any,
        description: props?.description ?? "",
        updatedAt: props?.updatedAt ?? "",
        quarters: props?.quarters ?? null,
        totalArrearsAmount: props?.totalArrearsAmount ?? null,
    });

    const onClose = props?.onClose;
    const onSaveSuccess = props?.onSaveSuccess;
    const onDeleteSuccess = props?.onDeleteSuccess;
    const residentId = props?.id;

    const handleFieldChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const showNotification = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ type: null, message: "" }), 3000);
    };

    // Save handler with optimistic UI update, error handling, and data refresh from database.
    const handleSave = async () => {
        if (!residentId) {
            showNotification("error", "ID penghuni tidak ditemui.");
            return;
        }

        setIsSaving(true);
        try {
            // Step 1: Update the resident.
            const cleanedIcNumber = stripUploadFormatting(formData.icNumber);
            const cleanedPhone = stripUploadFormatting(formData.phone);

            const updateResponse = await fetch(`/api/residents/${residentId}/update`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    icNumber: cleanedIcNumber,
                    phone: cleanedPhone,
                    email: formData.email,
                    position: formData.position,
                    department: formData.department,
                    serviceLevel: formData.serviceLevel,
                    status: formData.status === "Aktif" ? "AKTIF" : "TIDAK_LAYAK",
                    description: formData.description,
                }),
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json().catch(() => ({}));
                console.error("Gagal mengemas kini rekod:", errorData);
                throw new Error(getResidentApiErrorMessage(errorData, "Gagal menyimpan rekod."));
            }

            // Step 2: Fetch fresh data from database.
            const readResponse = await fetch(`/api/residents/${residentId}/read`);

            if (!readResponse.ok) {
                const errorData = await readResponse.json().catch(() => ({}));
                console.error("Gagal mendapatkan data terkini:", errorData);
                throw new Error(getResidentApiErrorMessage(errorData, "Gagal membaca data terkini dari database."));
            }

            const readData = (await readResponse.json()) as any;
            const freshData = readData.data;

            // Map fresh database data with proper types. (ResidentRecord Format)
            const mappedFreshData: ResidentRecord = {
                id: freshData.id ?? "",
                fullName: freshData.fullName ?? "",
                icNumber: freshData.icNumber ?? "",
                phone: freshData.phone ?? "",
                email: freshData.email ?? "",
                position: freshData.position ?? "",
                department: freshData.department ?? "",
                serviceLevel: freshData.serviceLevel ?? "",
                status: freshData.status ?? "AKTIF",
                description: freshData.description ?? "",
                updatedAt: freshData.updatedAt ?? "",
                quarters: freshData.quarters ?? null,
                totalArrearsAmount: freshData.totalArrearsAmount ?? null,
            };

            showNotification("success", "Rekod penghuni berjaya disimpan.");
            setKemasKini(false);
            
            // Sync detail modal with fresh database data.
            setFormData(mappedFreshData);
            
            // Update original data with fresh database values.
            setOriginalData(mappedFreshData);
            
            // Step 3: Update table with fresh data from database.
            if (onSaveSuccess) {
                onSaveSuccess(mappedFreshData);
            }
            
            setTimeout(() => onClose?.(), 1500);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan rekod.";
            showNotification("error", errorMessage);
            console.error("Error saving resident:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Delete handler with confirmation and error handling.
    const handleDelete = async () => {
        if (!residentId) {
            showNotification("error", "ID penghuni tidak ditemui.");
            return;
        }

        if (!confirm("Adakah anda pasti ingin memadamkan rekod penghuni ini? Tindakan ini tidak boleh dibatalkan.")) {
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/residents/${residentId}/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Gagal memadamkan rekod:", errorData);
                throw new Error(getResidentApiErrorMessage(errorData, "Gagal memadamkan rekod."));
            }

            showNotification("success", "Rekod penghuni berjaya dipadamkan.");
            
            // Call onDeleteSuccess to update parent component.
            if (onDeleteSuccess && residentId) {
                onDeleteSuccess(residentId);
            }
            
            setTimeout(() => onClose?.(), 1500);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Gagal memadamkan rekod.";
            showNotification("error", errorMessage);
            console.error("Error deleting resident:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("ms-MY", { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").join("/");
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
    }

    return (
        <div>
             {/* Notification Toast */}
            {notification.type && (
                <div className={`fixed bottom-8 z-55 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 animate-in fade-in duration-300 ${
                    notification.type === "success" ? "bg-green" : "bg-red"
                }`}>
                    <Icon icon={notification.type === "success" ? "check" : "close"} size={18} />
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}

            {/* Overlay Window */}
            <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm overflow-auto p-12 flex items-start justify-center">
                <div className="relative w-full rounded-lg shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-dark-blue p-6 flex items-center justify-between">
                        {/* Title & Subtitle */}
                        <div>
                            <h2 className="font-bold text-lg text-white">MAKLUMAT PENGHUNI</h2>
                            <p className="font-extralight text-xs text-light-grey">REKOD MAKLUMAT PENGHUNI KUARTERS KERAJAAN</p>
                        </div>

                        {/* Close Button */}
                        <button
                            aria-label="Close"
                            className="hover:scale-96 active:scale-92 text-white"
                            onClick={() => onClose && onClose()}
                        >
                            <Icon icon="close"></Icon>
                        </button>
                    </div>

                    {/* Tabs */}
                    <nav className="flex items-center justify-center gap-6 bg-white">
                        <button
                            onClick={() => setTab("info")}
                            className={`py-4 text-sm font-medium -mb-px ${tab === "info" ? "border-b-2 border-dark-blue text-dark-blue" : "text-gray-500"}`}
                        >
                            <span className="font-bold">MAKLUMAT PENGHUNI</span>
                        </button>
                        <button
                            onClick={() => setTab("history")}
                            className={`py-4 text-sm font-medium -mb-px ${tab === "history" ? "border-b-2 border-dark-blue text-dark-blue font-bold" : "text-gray-500"}`}
                        >
                            <span className="font-bold">SEJARAH TRANSAKSI</span>
                        </button>
                    </nav>

                    {/* Content */}
                    <div className="p-6 bg-light-blue">
                        {tab === "info" ? (
                            <div className="flex flex-col gap-8">
                                <section className="flex flex-col gap-4">
                                    <Topic content="MAKLUMAT PERIBADI" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="NAMA" value={displayValue(formData.fullName)} state={inputState} onChange={(value) => handleFieldChange("fullName", value)} className="col-span-1"/>
                                        <div className="col-span-1 grid grid-cols-2 gap-4">
                                            <InputFieldFormat label="NO. K/P" format="######-##-####" value={displayValue(formData.icNumber)} state={inputState} onChange={(value) => handleFieldChange("icNumber", value)} className="col-span-1"/>
                                            <InputField label="UMUR" value={displayValue(formData.icNumber ? calculateAgeByIc(formData.icNumber) : "") } state="inactive" className="col-span-1" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputFieldFormat label="NO. TELEFON" format="###-#### ####" value={displayValue(formData.phone)} state={inputState} onChange={(value) => handleFieldChange("phone", value)} className="col-span-1"/>
                                        <InputField label="EMEL" value={displayValue(formData.email)} state={inputState} onChange={(value) => handleFieldChange("email", value)} className="col-span-1"/>
                                    </div>
                                </section>

                                <section className="flex flex-col gap-4">
                                    <Topic content="MAKLUMAT PEKERJAAN" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="JAWATAN" value={displayValue(formData.position)} state={inputState} onChange={(value) => handleFieldChange("position", value)} className="col-span-1" />
                                        <InputField label="JABATAN" value={displayValue(formData.department)} state={inputState} onChange={(value) => handleFieldChange("department", value)} className="col-span-1" />
                                        <DropdownField label="TARAF PERKHIDMATAN" options={tarafPerkhidmatanOptions} value={displayValue(formData.serviceLevel as string)} state={inputState} onChange={(value) => handleFieldChange("serviceLevel", value)} className="col-span-1" />
                                        <DropdownField label="STATUS" options={statusOptions} value={formData.status === "AKTIF" ? "Aktif" : "Tidak Layak"} state={inputState} onChange={(value) => handleFieldChange("status", value === "Aktif" ? "AKTIF" : "TIDAK_LAYAK")} className="col-span-1" />
                                    </div>
                                </section>

                                <section className="flex flex-col gap-4">
                                    <Topic content="MAKLUMAT KUARTERS" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="KATEGORI" value={displayValue(formData.quarters?.quarterName)} state="inactive" className="col-span-1"/>
                                        <InputField label="UNIT KUARTERS" value={displayValue(formData.quarters?.unitCode)} state="inactive" className="col-span-1"/>
                                        <div className="col-span-1 grid grid-cols-2 gap-4">
                                            <InputField label="TARIKH MASUK" value={displayValue(formatDate(formData.quarters?.moveInDate ?? ""))} state="inactive" className="col-span-1"/>
                                            <InputField label="TARIKH KELUAR" value={displayValue(formData.quarters?.moveOutDate ? formatDate(formData.quarters.moveOutDate) : "")} state="inactive" className="col-span-1"/>
                                        </div>
                                        <InputField label="TUNGGAKAN (RM)" value={formData.totalArrearsAmount?.totalArrearsAmount != null ? `${Number(formData.totalArrearsAmount.totalArrearsAmount).toFixed(2).toString()}` : displayValue("")} state="inactive" className={`col-span-1 ${formData.totalArrearsAmount?.totalArrearsAmount != null ? getArrearsTextClass(Number(formData.totalArrearsAmount.totalArrearsAmount)) : ""}`}/>
                                    </div>
                                </section>

                                <section className="flex flex-col gap-4">
                                    <Topic content="LAIN-LAIN" />
                                    <InputBox label="CATATAN" value={displayValue(formData.description)} state={inputState} onChange={(value) => handleFieldChange("description", value)} className="col-span-2" />
                                </section>

                                {/* Footer */}
                                        {!kemasKini ? (
                                    // Footer View when not in Edit Mode
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-row gap-1 items-center justify-center text-grey/80">
                                            <Icon icon="history" size={13} className=""></Icon>
                                            <div className="text-xs">Dikemaskini Kali Terakhir Pada: {formData.updatedAt ? formatDate(formData.updatedAt) : "N/A"}, {formData.updatedAt ? formatTime(formData.updatedAt) : "N/A"}</div>
                                        </div>
                                        <div className="flex gap-3 w-xs">
                                            <button 
                                                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-red px-5 py-3 rounded-md hover:bg-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                type="button"
                                                onClick={handleDelete}
                                                disabled={isDeleting}
                                            >
                                                <Icon icon="delete" size={16} />
                                                {isDeleting ? "Sedang Padam..." : "Padam Rekod"}
                                            </button>
                                            <button 
                                                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-dark-blue px-5 py-3 rounded-md hover:bg-dark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                type="button"
                                                onClick={() => setKemasKini(true)}
                                                disabled={isDeleting}
                                            >
                                                <Icon icon="edit" size={16} />
                                                Kemas Kini
                                            </button>
                                        </div>
                                    </div>
                                ) : kemasKini && (
                                    // Footer View when in Edit Mode
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-row gap-1 items-center justify-center text-grey/80">
                                            <Icon icon="edit" size={13} className=""></Icon>
                                            <div className="text-xs">Sedang menyunting rekod ini...</div>
                                        </div>
                                        <div className="flex gap-3 w-xs">
                                            <button 
                                                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-red px-5 py-3 rounded-md hover:bg-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                type="button"
                                                onClick={() => {
                                                    setFormData(originalData);
                                                    setKemasKini(false);
                                                }}
                                                disabled={isSaving}
                                            >
                                                <Icon icon="close" size={16} />
                                                Batal
                                            </button>
                                            <button 
                                                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-green px-5 py-3 rounded-md hover:bg-dark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                type="button"
                                                onClick={handleSave}
                                                disabled={isSaving}
                                            >
                                                <Icon icon="save" size={16} />
                                                {isSaving ? "Sedang Simpan..." : "Simpan Rekod"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600">Sejarah transaksi belum ada (placeholder).</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
