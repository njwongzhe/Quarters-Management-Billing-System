"use client";

import Icon from "@/app/components/Icon";
import { useState } from "react";
import { InputField, InputFieldFormat, InputBox, DropdownField } from "./InputField";

type PenghuniCreateProps = {
    onClose?: () => void;
    onCreateSuccess?: (newResident: any) => void;
};

type NotificationState = {
    type: "success" | "error" | null;
    message: string;
};

function Topic({ content, className }: { content: string, className?: string }) {
    return (
        <span className={`border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest ${className || ""}`}>{content}</span>
    );
}

export default function PenghuniCreate(props?: PenghuniCreateProps) {
    const tarafPerkhidmatanOptions = ["Persekutuan", "Negeri"];
    const statusOptions = [
        { label: "Aktif", color: "text-aktif" },
        { label: "Tidak Layak", color: "text-x-layak" },
        { label: "Pencen Mendatang", color: "text-pencen-datang" },
        { label: "Data Tidak Lengkap", color: "text-x-lengkap" },
        { label: "Keluar", color: "text-keluar" }
    ];

    const [isCreating, setIsCreating] = useState(false);
    const [notification, setNotification] = useState<NotificationState>({ type: null, message: "" });

    const [formData, setFormData] = useState({
        fullName: "",
        icNumber: "",
        phone: "",
        email: "",
        position: "",
        department: "",
        serviceLevel: "Persekutuan",
        status: "Aktif",
        description: "",
    });

    const onClose = props?.onClose;
    const onCreateSuccess = props?.onCreateSuccess;

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

    const handleCreate = async () => {
        if (!formData.fullName || !formData.icNumber) {
            showNotification("error", "Nama dan No. KP adalah wajib.");
            return;
        }

        setIsCreating(true);
        try {
            // Bersihkan format `-` dan ruang kosong sebelum menghantar ke pelayan API
            const cleanedIcNumber = formData.icNumber.replace(/[\s-]/g, "");
            const cleanedPhone = formData.phone ? formData.phone.replace(/[\s-]/g, "") : null;

            const response = await fetch(`/api/residents/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    icNumber: cleanedIcNumber,
                    phone: cleanedPhone,
                    email: formData.email || null,
                    position: formData.position || null,
                    department: formData.department || null,
                    serviceLevel: formData.serviceLevel || null,
                    status: formData.status === "Aktif" ? "AKTIF" : "TIDAK_LAYAK",
                    description: formData.description || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Gagal menambah rekod (${response.status})`);
            }

            const responseData = await response.json();
            showNotification("success", "Rekod penghuni berjaya ditambah.");
            
            if (onCreateSuccess && responseData.data) {
                onCreateSuccess(responseData.data);
            }

            setTimeout(() => onClose?.(), 1500);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Gagal menambah rekod.";
            showNotification("error", errorMessage);
            console.error("Error creating resident:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            {/* Notification Toast */}
            {notification.type && (
                <div className={`fixed bottom-8 z-60 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 animate-in fade-in duration-300 ${
                    notification.type === "success" ? "bg-green" : "bg-red"
                }`}>
                    <Icon icon={notification.type === "success" ? "check" : "close"} size={18} />
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}

        <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm overflow-auto p-12 flex items-start justify-center">
            <div className="relative w-full rounded-lg shadow-2xl overflow-hidden">
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
                        onClick={() => onClose && onClose()}
                    >
                        <Icon icon="close"></Icon>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-light-blue">
                    <div className="flex flex-col gap-8">
                        <section className="flex flex-col gap-4">
                            <Topic content="MAKLUMAT PERIBADI" />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="NAMA" value={formData.fullName} state="active" onChange={(value) => handleFieldChange("fullName", value)} placeholder="Cth: Ahmad Zaki" className="col-span-1"/>
                                <InputFieldFormat label="NO. K/P" format="######-##-####" value={formData.icNumber} state="active" onChange={(value) => handleFieldChange("icNumber", value)} placeholder="Cth: XXXXXX-XX-XXXX" className="col-span-1"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <InputFieldFormat label="NO. TELEFON" format="###-#### ####" value={formData.phone} state="active" onChange={(value) => handleFieldChange("phone", value)} placeholder="Cth: 012-345 6789" className="col-span-1"/>
                                <InputField label="EMEL" value={formData.email} state="active" onChange={(value) => handleFieldChange("email", value)} placeholder="Cth: ahmad@email.com" className="col-span-1"/>
                            </div>
                        </section>

                        <section className="flex flex-col gap-4">
                            <Topic content="MAKLUMAT PEKERJAAN" />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="JAWATAN" value={formData.position} state="active" onChange={(value) => handleFieldChange("position", value)} placeholder="Cth: Pegawai Tadbir" className="col-span-1" />
                                <InputField label="JABATAN" value={formData.department} state="active" onChange={(value) => handleFieldChange("department", value)} placeholder="Cth: Jabatan Perdana Menteri" className="col-span-1" />
                                <DropdownField label="TARAF PERKHIDMATAN" options={tarafPerkhidmatanOptions} value={formData.serviceLevel} state="active" onChange={(value) => handleFieldChange("serviceLevel", value)} placeholder="Pilih Taraf Perkhidmatan" className="col-span-1" />
                                <DropdownField label="STATUS" options={statusOptions} value={formData.status} state="active" onChange={(value) => handleFieldChange("status", value)} placeholder="Pilih Status" className="col-span-1" />
                            </div>
                        </section>

                        <section className="flex flex-col gap-4">
                            <Topic content="LAIN-LAIN" />
                            <InputBox label="CATATAN" value={formData.description} state="active" onChange={(value) => handleFieldChange("description", value)} placeholder="Masukkan nota atau catatan tambahan (jika ada)..." className="col-span-2" />
                        </section>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-row gap-1 items-center justify-center text-grey/80">
                                <Icon icon="add" size={13} className=""></Icon>
                                <div className="text-xs">Menambah rekod penghuni baru...</div>
                            </div>
                            <div className="flex gap-3 w-xs">
                                <button 
                                    className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-red px-5 py-3 rounded-md hover:bg-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    type="button"
                                    onClick={() => onClose && onClose()}
                                    disabled={isCreating}
                                >
                                    <Icon icon="close" size={16} />
                                    Batal
                                </button>
                                <button 
                                    className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap font-bold text-xs text-white bg-green px-5 py-3 rounded-md hover:bg-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={isCreating}
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
        </>
    );
}
