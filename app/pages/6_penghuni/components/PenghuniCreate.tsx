"use client";

import Icon from "@/app/components/Icon";
import { useState } from "react";
import { InputField, InputFieldFormat, InputBox, DropdownField, Topic } from "./InputField";
import { handleCreate, handleFieldChange, stripResidentFormatting } from "../controller/DatabaseControl";

type PenghuniCreateProps = {
    onClose?: () => void;
    onCreateSuccess?: (newResident: any) => void;
};

type NotificationState = {
    type: "success" | "error" | null;
    message: string;
};

export default function PenghuniCreate(props?: PenghuniCreateProps) {
    // Dropdown options for service level and status fields.
    const tarafPerkhidmatanOptions = ["Persekutuan", "Negeri"];
    // Only allow setting initial status to Aktif or Tidak Layak during creation
    const statusOptions = [
        { label: "Data Tidak Lengkap", color: "text-x-lengkap" },
        { label: "Aktif", color: "text-aktif" },
        { label: "Tidak Layak", color: "text-x-layak" },
    ];

    // Form Status
    const [name, setName] = useState("");
    const [icNumber, setIcNumber] = useState("");
    const isNameValid = name.trim() !== "";
    const isIcValid = icNumber.length > 0 && stripResidentFormatting(icNumber).length === 12;
    const isFormValid = isNameValid && isIcValid;

    // State for form data, loading status and notifications.
    const [isCreating, setIsCreating] = useState(false);
    const [notification, setNotification] = useState<NotificationState>({ type: null, message: "" });

    // Initial form data state with default values. (Will be updated as user fills the form.)
    const [formData, setFormData] = useState({
        fullName: "",
        icNumber: "",
        phone: "",
        email: "",
        position: "",
        department: "",
        serviceLevel: "",
        status: "Data Tidak Lengkap",
        description: "",
    });

    // Extracting callbacks from props for use in handlers.
    const onClose = props?.onClose;
    const onCreateSuccess = props?.onCreateSuccess;

    // Function to display notification messages for success or error events.
    const showNotification = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ type: null, message: "" }), 3000);
    };

    // Handler function for creating a new resident record. It uses the handleCreate function from DatabaseControl and passes necessary parameters and callbacks.
    const handleCreateResident = handleCreate.bind(null, {
        formData,
        onCreateSuccess,
        onClose,
        setIsCreating,
        showNotification,
    });

    const validateForm = () => {
        const nextNameValid = name.trim() !== "";
        const nextIcValid = icNumber.length > 0 && stripResidentFormatting(icNumber).length === 12;

        return nextNameValid && nextIcValid;
    };

    return (
        <div>
            {/* Notification Toast */}
            {notification.type && (
                <div className={`fixed bottom-8 z-60 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 animate-in fade-in duration-300 ${
                    notification.type === "success" ? "bg-green" : "bg-red"
                }`}>
                    <Icon icon={notification.type === "success" ? "check" : "close"} size={18} />
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}

            <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center">
                <div className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full">
                    {/* Header */}
                    <div className="bg-dark-blue p-6 flex items-center justify-between">
                        {/* Title & Subtitle */}
                        <div>
                            <h2 className="font-bold text-lg text-white">TAMBAH PENGHUNI BARU</h2>
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

                    {/* Content */}
                    <div className="p-6 bg-light-blue overflow-y-auto">
                        <div className="flex flex-col gap-8">
                            {/* Section for Personal Information */}
                            <section className="flex flex-col gap-4">
                                <Topic content="MAKLUMAT PERIBADI" />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="NAMA"
                                        value={name}
                                        state="active"
                                        onChange={(value) => {
                                            setName(value);
                                            handleFieldChange(setFormData, "fullName", value);
                                        }}
                                        placeholder="Cth: Ahmad Zaki"
                                        className="col-span-1"
                                        error={!isNameValid}
                                        errorMessage={!isNameValid ? "Nama diperlukan." : ""}
                                    />
                                    <InputFieldFormat
                                        label="NO. K/P"
                                        format="######-##-####"
                                        value={icNumber}
                                        state="active"
                                        onChange={(value) => {
                                            setIcNumber(value);
                                            handleFieldChange(setFormData, "icNumber", value);
                                        }}
                                        placeholder="Cth: XXXXXX-XX-XXXX"
                                        className="col-span-1"
                                        error={!isIcValid}
                                        errorMessage={!isIcValid ? "No. K/P mesti 12 digit." : ""}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputFieldFormat label="NO. TELEFON" format="###-#### ####" value={formData.phone} state="active" onChange={handleFieldChange.bind(null, setFormData, "phone")} placeholder="Cth: 012-345 6789" className="col-span-1"/>
                                    <InputField label="EMEL" value={formData.email} state="active" onChange={handleFieldChange.bind(null, setFormData, "email")} placeholder="Cth: ahmad@email.com" className="col-span-1"/>
                                </div>
                            </section>

                            {/* Section for Employment Information */}
                            <section className="flex flex-col gap-4">
                                <Topic content="MAKLUMAT PEKERJAAN" />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="JAWATAN" value={formData.position} state="active" onChange={handleFieldChange.bind(null, setFormData, "position")} placeholder="Cth: Pegawai Tadbir" className="col-span-1" />
                                    <InputField label="JABATAN" value={formData.department} state="active" onChange={handleFieldChange.bind(null, setFormData, "department")} placeholder="Cth: Jabatan Perdana Menteri" className="col-span-1" />
                                    <DropdownField label="TARAF PERKHIDMATAN" options={tarafPerkhidmatanOptions} value={formData.serviceLevel} state="active" onChange={handleFieldChange.bind(null, setFormData, "serviceLevel")} placeholder="Pilih Taraf Perkhidmatan" className="col-span-1" />
                                    <DropdownField label="STATUS" options={statusOptions} value={formData.status} state="inactive" onChange={handleFieldChange.bind(null, setFormData, "status")} placeholder="Pilih Status" className="col-span-1" />
                                </div>
                            </section>

                            {/* Section for Additional Notes */}
                            <section className="flex flex-col gap-4">
                                <Topic content="LAIN-LAIN" />
                                <InputBox label="CATATAN" value={formData.description} state="active" onChange={handleFieldChange.bind(null, setFormData, "description")} placeholder="Masukkan nota atau catatan tambahan (jika ada)..." className="col-span-2" />
                            </section>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                                <div className="flex flex-row gap-1 items-center justify-center text-grey/80">
                                    <Icon icon="add" size={13} className=""></Icon>
                                    <div className="text-xs">Menambah rekod penghuni baru...</div>
                                </div>
                                <div className="flex gap-3 w-xs">
                                    {/* Cancel Button */}
                                    <button 
                                        className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-red px-5 py-3 rounded-md hover:bg-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        type="button"
                                        onClick={onClose}
                                        disabled={isCreating}
                                    >
                                        <Icon icon="close" size={16} />
                                        Batal
                                    </button>

                                    {/* Tambah Rekod Button */}
                                    <button 
                                        className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-green px-5 py-3 rounded-md hover:bg-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        type="button"
                                        onClick={() => {
                                            const isReadyToSubmit = validateForm();

                                            if (!isReadyToSubmit) {
                                                return;
                                            }

                                            handleCreateResident();
                                        }}
                                        disabled={isCreating || !isFormValid}
                                    >
                                        <Icon icon="add" size={16} />
                                        {isCreating ? "Sedang Tambah..." : "Tambah Rekod"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
