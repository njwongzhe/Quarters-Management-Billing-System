"use client";

import Icon from "@/app/components/Icon/Icon";
import { useState, useEffect } from "react";
import { calculateAgeByIc } from "@/app/utils/resident";
import type { ResidentRecord } from "../page";
import { InputField, InputFieldFormat, InputBox, DropdownField, Topic, type DropdownOption } from "../../../components/InputField";
import { handleDelete, handleFieldChange, handleResidentStatusFieldChange, handleSave, stripResidentFormatting } from "../controller/DatabaseControl";
import PenghuniDetailHistory from "./PenghuniDetailHistory";
import { resolveResidentStatusRules } from "../controller/StatusControl";


type PenghuniDetailWithCloseProps = ResidentRecord & {
    onClose?: () => void;
    onSaveSuccess?: (updatedData: Partial<ResidentRecord>) => void;
    onDeleteSuccess?: (residentId: string) => void;
};

type NotificationState = {
    type: "success" | "error" | null;
    message: string;
};

// Helper function for displaying arrears amount
function getArrearsTextClass(amount: number) {
    if (amount < 0) return "text-green";
    if (amount > 0) return "text-red";
    return "";
}

// Helper function to format date for display
function formatDateForDisplay(dateString: string | null | undefined) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ms-MY", { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").join("/");
}

export default function PenghuniDetail(props?: PenghuniDetailWithCloseProps) {
    // Tab State
    const [tab, setTab] = useState<"info" | "history">("info");

    // Dropdown options for service level and status fields.
    const tarafPerkhidmatanOptions: DropdownOption[] = [
        { label: "Persekutuan" },
        { label: "Negeri" }
    ];
    const statusOptions: DropdownOption[] = [
        { label: "Aktif", color: "text-aktif" },
        { label: "Tidak Layak", color: "text-x-layak" },
        { label: "Pencen Mendatang", color: "text-pencen-datang" },
        { label: "Data Tidak Lengkap", color: "text-x-lengkap" },
    ];

    // State for managing edit mode, saving/deleting status and notifications.
    const [kemasKini, setKemasKini] = useState(false);
    const inputState = kemasKini ? "active" : "inactive";
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState<NotificationState>({ type: null, message: "" });
    const isInactive = inputState === "inactive";

    // Helper function to display field values, showing "N/A" for empty values when in inactive state.
    const displayValue = (value: string | null | undefined) => {
        if (value == null || value === "")
            return isInactive ? "N/A" : "";

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

    // Extracted props for easier access and to avoid optional chaining in handlers.
    const onClose = props?.onClose;
    const onSaveSuccess = props?.onSaveSuccess;
    const onDeleteSuccess = props?.onDeleteSuccess;
    const residentId = props?.id;

    // Function to show notification messages. (Success or Error)
    const showNotification = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ type: null, message: "" }), 3000);
    };

    // Helper function to format date for display.
    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("ms-MY", { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").join("/");
    };

    const statusRules = resolveResidentStatusRules(
        originalData.status as string,
        formData.icNumber,
        kemasKini,
        statusOptions,
    );

    useEffect(() => {
        if (!statusRules.forcedStatus) {
            return;
        }

        if (formData.status !== statusRules.forcedStatus) {
            setFormData(prev => ({ ...prev, status: statusRules.forcedStatus ?? prev.status }));
        }
    }, [formData.status, setFormData, statusRules.forcedStatus]);

    // Handlers for Save operation.
    const handleSaveResident = handleSave.bind(null, {
        residentId: residentId ?? "",
        formData,
        setIsSaving,
        showNotification,
        setKemasKini,
        setFormData,
        setOriginalData,
        onSaveSuccess,
        onClose,
    });

    // Validate status transition rules before saving.
    const validateAndSave = () => {
        if (!isFormValid) {
            showNotification("error", "Sila semak medan NAMA dan NO. KP.");
            return;
        }

        if (!statusRules.allowedStatuses.includes(formData.status as string)) {
            showNotification("error", "Perubahan status tidak dibenarkan untuk rekod ini.");
            return;
        }

        void handleSaveResident();
    };

    // Handler for Delete operation.
    const handleDeleteResident = handleDelete.bind(null, {
        residentId: residentId ?? "",
        setIsDeleting,
        showNotification,
        onDeleteSuccess,
        onClose,
    });

    // Helper function to format time for display.
    const formatTime = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
    }

    const statusFieldOptions = statusRules.options;
    const statusFieldState = statusRules.state;

    // Form Status
    const nameValue = formData.fullName ?? "";
    const icValue = formData.icNumber ?? "";
    const isNameValid = nameValue.trim() !== "";
    const isIcValid = stripResidentFormatting(icValue).length === 12;
    const isFormValid = isNameValid && isIcValid;

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
            <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center">
                <div className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full">
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
                            onClick={onClose}
                        >
                            <Icon icon="close"></Icon>
                        </button>
                    </div>

                    {/* Tabs */}
                    <nav className="flex items-center justify-center gap-6 bg-white">
                        <button
                            onClick={() => setTab("info")}
                            className={`py-4 text-sm font-medium -mb-px ${tab === "info" ? "border-b-4 border-dark-blue text-dark-blue" : "text-gray-500"}`}
                        >
                            <span className="font-bold">MAKLUMAT PENGHUNI</span>
                        </button>
                        <button
                            onClick={() => setTab("history")}
                            className={`py-4 text-sm font-medium -mb-px ${tab === "history" ? "border-b-4 border-dark-blue text-dark-blue font-bold" : "text-gray-500"}`}
                        >
                            <span className="font-bold">SEJARAH TRANSAKSI</span>
                        </button>
                    </nav>

                    {/* Content */}
                    <div className="p-6 bg-light-blue overflow-y-auto">
                        {tab === "info" ? (
                            <div className="flex flex-col gap-8">
                                {/* Section for Personal Information */}
                                <section className="flex flex-col gap-4">
                                    <Topic content="MAKLUMAT PERIBADI" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            label="NAMA"
                                            value={displayValue(formData.fullName)}
                                            state={inputState}
                                            onChange={handleFieldChange.bind(null, setFormData, "fullName")}
                                            className="col-span-1"
                                            error={kemasKini && !isNameValid}
                                            errorMessage={kemasKini && !isNameValid ? "Sila masukkan nama." : ""}
                                        />
                                        <div className="col-span-1 grid grid-cols-2 gap-4">
                                            <InputFieldFormat
                                                label="NO. K/P"
                                                format="######-##-####"
                                                value={displayValue(formData.icNumber)}
                                                state={inputState}
                                                onChange={handleFieldChange.bind(null, setFormData, "icNumber")}
                                                className="col-span-1"
                                                error={kemasKini && !isIcValid}
                                                errorMessage={kemasKini && !isIcValid ? "No. KP mesti mengandungi 12 digit." : ""}
                                            />
                                            <InputField label="UMUR" value={displayValue(formData.icNumber ? calculateAgeByIc(formData.icNumber) : "") } state="inactive" className="col-span-1" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputFieldFormat label="NO. TELEFON" format="###-#### ####" value={displayValue(formData.phone)} state={inputState} onChange={handleFieldChange.bind(null, setFormData, "phone")} className="col-span-1"/>
                                        <InputField label="EMEL" value={displayValue(formData.email)} state={inputState} onChange={handleFieldChange.bind(null, setFormData, "email")} className="col-span-1"/>
                                    </div>
                                </section>

                                {/* Section for Employment Information */}
                                <section className="flex flex-col gap-4">
                                    <Topic content="MAKLUMAT PEKERJAAN" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="JAWATAN" value={displayValue(formData.position)} state={inputState} onChange={handleFieldChange.bind(null, setFormData, "position")} className="col-span-1" />
                                        <InputField label="JABATAN" value={displayValue(formData.department)} state={inputState} onChange={handleFieldChange.bind(null, setFormData, "department")} className="col-span-1" />
                                        <DropdownField label="TARAF PERKHIDMATAN" options={tarafPerkhidmatanOptions} value={displayValue(formData.serviceLevel as string)} state={inputState} onChange={handleFieldChange.bind(null, setFormData, "serviceLevel")} className="col-span-1" />
                                        {/* Status Selection With Restricted Transitions */}
                                        <DropdownField
                                            label="STATUS"
                                            options={statusFieldOptions}
                                            value={(function() {
                                                switch (formData.status) {
                                                    case "AKTIF": return "Aktif";
                                                    case "TIDAK_LAYAK": return "Tidak Layak";
                                                    case "PENCEN_MENDATANG": return "Pencen Mendatang";
                                                    case "DATA_TIDAK_LENGKAP": return "Data Tidak Lengkap";
                                                    default: return formData.status as string;
                                                }
                                            })()}
                                            state={statusFieldState}
                                            onChange={(val: string) => {
                                                const mapping: Record<string, string> = {
                                                    "Aktif": "AKTIF",
                                                    "Tidak Layak": "TIDAK_LAYAK",
                                                    "Pencen Mendatang": "PENCEN_MENDATANG",
                                                    "Data Tidak Lengkap": "DATA_TIDAK_LENGKAP",
                                                };

                                                const newStatus = mapping[val] ?? val;

                                                if (!statusRules.allowedStatuses.includes(newStatus)) {
                                                    showNotification("error", "Perubahan status tidak dibenarkan untuk rekod ini.");
                                                    return;
                                                }

                                                handleResidentStatusFieldChange(setFormData, val);
                                            }}
                                            className="col-span-1"
                                            />
                                    </div>
                                </section>

                                {/* Section for Quarters Information */}
                                <section className="flex flex-col gap-4">
                                    <Topic content="MAKLUMAT KUARTERS" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="KATEGORI" value={formData.quarters?.quarterName ?? (isInactive ? "N/A" : "")} state="inactive" className="col-span-1"/>
                                        <InputField label="UNIT KUARTERS" value={formData.quarters?.unitCode ?? (isInactive ? "N/A" : "")} state="inactive" className="col-span-1"/>
                                        <InputField label="ALAMAT KUARTERS" value={formData.quarters?.address ?? (isInactive ? "N/A" : "")} state="inactive" className="col-span-2"/>
                                        <div className="col-span-1 grid grid-cols-2 gap-4">
                                            <InputField label="TARIKH MASUK" value={formatDateForDisplay(formData.quarters?.moveInDate)} state="inactive" className="col-span-1"/>
                                            <InputField label="TARIKH KELUAR" value={formatDateForDisplay(formData.quarters?.moveOutDate)} state="inactive" className="col-span-1"/>
                                        </div>
                                        <InputField label="TUNGGAKAN (RM)" value={formData.totalArrearsAmount?.totalArrearsAmount != null ? `${Number(formData.totalArrearsAmount.totalArrearsAmount).toFixed(2).toString()}` : (isInactive ? "N/A" : "")} state="inactive" className={`col-span-1 ${formData.totalArrearsAmount?.totalArrearsAmount != null ? getArrearsTextClass(Number(formData.totalArrearsAmount.totalArrearsAmount)) : ""}`}/>
                                    </div>
                                </section>

                                {/* Section for Additional Notes */}
                                <section className="flex flex-col gap-4">
                                    <Topic content="LAIN-LAIN" />
                                    <InputBox label="CATATAN" value={displayValue(formData.description)} state={inputState} onChange={handleFieldChange.bind(null, setFormData, "description")} className="col-span-2" />
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
                                                onClick={handleDeleteResident}
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
                                                onClick={validateAndSave}
                                                disabled={isSaving || !isFormValid}
                                            >
                                                <Icon icon="save" size={16} />
                                                {isSaving ? "Sedang Simpan..." : "Simpan Rekod"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <PenghuniDetailHistory residentId={residentId} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
