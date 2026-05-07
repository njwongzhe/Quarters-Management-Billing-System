import type { Dispatch, SetStateAction } from "react";
import type { ResidentRecord } from "../page";
import type { PenghuniFilterState } from "../components/PenghuniFilter";

export type NotificationType = "success" | "error";

export type ResidentCreateFormData = {
    fullName: string;
    icNumber: string;
    phone: string;
    email: string;
    position: string;
    department: string;
    serviceLevel: string;
    status: string;
    description: string;
};

export type ResidentUpdateFormData = ResidentRecord;

// Helper function to handle form field changes and update the corresponding state.
export function handleFieldChange(
    setFormData: Dispatch<SetStateAction<any>>,
    field: string,
    value: any,
) {
    setFormData((prev: Record<string, any>) => ({
        ...prev,
        [field]: value,
    }));
}

// Helper function to handle status field changes and convert display values to API values.
export function handleResidentStatusFieldChange(
    setFormData: Dispatch<SetStateAction<any>>,
    value: string,
) {
    const mapping: Record<string, string> = {
        "Aktif": "AKTIF",
        "Tidak Layak": "TIDAK_LAYAK",
        "Pencen Mendatang": "PENCEN_MENDATANG",
        "Data Tidak Lengkap": "DATA_TIDAK_LENGKAP",
    };

    handleFieldChange(
        setFormData,
        "status",
        mapping[value] ?? value,
    );
}

// Helper function to handle filter changes and update the filter state accordingly.
export function handleFilterSearch(
    setFilterState: Dispatch<SetStateAction<PenghuniFilterState>>,
    filters: PenghuniFilterState,
) {
    setFilterState(filters);
}

// Helper function to reset filter state to default values.
export function handleFilterReset(
    setFilterState: Dispatch<SetStateAction<PenghuniFilterState>>,
) {
    setFilterState({
        nama: "",
        noKp: "",
        noTel: "",
        emel: "",
        statuses: {
            aktif: true,
            tidakLayak: true,
            pencenDatang: true,
            tidakLengkap: true,
            keluar: true,
        },
    });
}

// Helper function to add a newly created resident record to the existing residents state.
export function handleCreateSuccess(
    setResidents: Dispatch<SetStateAction<ResidentRecord[]>>,
    newResident: ResidentRecord,
) {
    setResidents(prev => [newResident, ...prev]);
}

// Helper function to update a resident record in the residents state after a successful update operation.
export function handleResidentUpdate(
    setResidents: Dispatch<SetStateAction<ResidentRecord[]>>,
    setSelectedResident: Dispatch<SetStateAction<ResidentRecord | null>>,
    selectedResidentId: string | null,
    updatedData: Partial<ResidentRecord>,
) {
    if (!selectedResidentId) {
        return;
    }

    setResidents(prev => prev.map(resident => (
        resident.id === selectedResidentId
            ? {
                ...resident,
                fullName: updatedData.fullName ?? resident.fullName,
                icNumber: updatedData.icNumber ?? resident.icNumber,
                phone: updatedData.phone ?? resident.phone,
                email: updatedData.email ?? resident.email,
                position: updatedData.position ?? resident.position,
                department: updatedData.department ?? resident.department,
                serviceLevel: updatedData.serviceLevel ?? resident.serviceLevel,
                status: updatedData.status ?? resident.status,
                description: updatedData.description ?? resident.description,
            }
            : resident
    )));

    setSelectedResident(prev => (
        prev
            ? {
                ...prev,
                fullName: updatedData.fullName ?? prev.fullName,
                icNumber: updatedData.icNumber ?? prev.icNumber,
                phone: updatedData.phone ?? prev.phone,
                email: updatedData.email ?? prev.email,
                position: updatedData.position ?? prev.position,
                department: updatedData.department ?? prev.department,
                serviceLevel: updatedData.serviceLevel ?? prev.serviceLevel,
                status: updatedData.status ?? prev.status,
                description: updatedData.description ?? prev.description,
            }
            : null
    ));
}

// Helper function to remove a resident record from the residents state after a successful delete operation.
export function handleResidentDelete(
    setResidents: Dispatch<SetStateAction<ResidentRecord[]>>,
    residentId: string,
) {
    setResidents(prev => prev.filter(resident => resident.id !== residentId));
}

// Helper function to display notifications to the user based on the type and message provided.
export function stripResidentFormatting(value: string | null | undefined) {
    return String(value ?? "").replace(/[\s-]/g, "");
}

// Helper function to generate user-friendly error messages based on API error responses.
export function getResidentApiErrorMessage(errorData: any, fallbackMessage: string) {
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

// Helper function to normalize resident data received from the API into the ResidentRecord format used in the frontend.
export function normalizeResidentRecord(freshData: any): ResidentRecord {
    return {
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
}

// Helper function to generate user-friendly error messages based on API error responses.
export async function handleCreate(params: {
    formData: ResidentCreateFormData;
    onCreateSuccess?: (newResident: any) => void;
    onClose?: () => void;
    setIsCreating: (value: boolean) => void;
    showNotification: (type: NotificationType, message: string) => void;
}) {
    const {
        formData,
        onCreateSuccess,
        onClose,
        setIsCreating,
        showNotification,
    } = params;

    if (!formData.fullName || !formData.icNumber) {
        showNotification("error", "Nama dan No. KP adalah wajib.");
        return;
    }

    setIsCreating(true);
    try {
        const cleanedIcNumber = stripResidentFormatting(formData.icNumber);
        const cleanedPhone = formData.phone ? stripResidentFormatting(formData.phone) : null;

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
                status: formData.status,
                description: formData.description || null,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(getResidentApiErrorMessage(errorData, `Gagal menambah rekod (${response.status})`));
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
}

// Helper function to handle the save operation for updating a resident record, including API calls and state updates.
export async function handleSave(params: {
    residentId: string;
    formData: ResidentUpdateFormData;
    setIsSaving: (value: boolean) => void;
    showNotification: (type: NotificationType, message: string) => void;
    setKemasKini: (value: boolean) => void;
    setFormData: Dispatch<SetStateAction<ResidentRecord>>;
    setOriginalData: Dispatch<SetStateAction<ResidentRecord>>;
    onSaveSuccess?: (updatedData: Partial<ResidentRecord>) => void;
    onClose?: () => void;
}) {
    const {
        residentId,
        formData,
        setIsSaving,
        showNotification,
        setKemasKini,
        setFormData,
        setOriginalData,
        onSaveSuccess,
        onClose,
    } = params;

    if (!residentId) {
        showNotification("error", "ID penghuni tidak ditemui.");
        return null;
    }

    setIsSaving(true);
    try {
        const updateResponse = await fetch(`/api/residents/${residentId}/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: formData.fullName,
                icNumber: stripResidentFormatting(formData.icNumber),
                phone: stripResidentFormatting(formData.phone),
                email: formData.email,
                position: formData.position,
                department: formData.department,
                serviceLevel: formData.serviceLevel,
                status: formData.status,
                description: formData.description,
            }),
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json().catch(() => ({}));
            console.error("Gagal mengemas kini rekod:", errorData);
            throw new Error(getResidentApiErrorMessage(errorData, "Gagal menyimpan rekod."));
        }

        const readResponse = await fetch(`/api/residents/${residentId}/read`);

        if (!readResponse.ok) {
            const errorData = await readResponse.json().catch(() => ({}));
            console.error("Gagal mendapatkan data terkini:", errorData);
            throw new Error(getResidentApiErrorMessage(errorData, "Gagal membaca data terkini dari database."));
        }

        const readData = (await readResponse.json()) as any;
        const freshData = normalizeResidentRecord(readData.data);

        showNotification("success", "Rekod penghuni berjaya disimpan.");
        setKemasKini(false);
        setFormData(freshData);
        setOriginalData(freshData);

        if (onSaveSuccess) {
            onSaveSuccess(freshData);
        }

        setTimeout(() => onClose?.(), 1500);
        return;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan rekod.";
        showNotification("error", errorMessage);
        console.error("Error saving resident:", error);
        return;
    } finally {
        setIsSaving(false);
    }
}

// Helper function to handle the delete operation for a resident record, including API calls and state updates.
export async function handleDelete(params: {
    residentId: string;
    setIsDeleting: (value: boolean) => void;
    showNotification: (type: NotificationType, message: string) => void;
    onDeleteSuccess?: (residentId: string) => void;
    onClose?: () => void;
}) {
    const {
        residentId,
        setIsDeleting,
        showNotification,
        onDeleteSuccess,
        onClose,
    } = params;

    if (!residentId) {
        showNotification("error", "ID penghuni tidak ditemui.");
        return false;
    }

    if (!confirm("Adakah anda pasti ingin memadamkan rekod penghuni ini? Tindakan ini tidak boleh dibatalkan.")) {
        return false;
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

        if (onDeleteSuccess) {
            onDeleteSuccess(residentId);
        }

        setTimeout(() => onClose?.(), 1500);
        return;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal memadamkan rekod.";
        showNotification("error", errorMessage);
        console.error("Error deleting resident:", error);
        return;
    } finally {
        setIsDeleting(false);
    }
}