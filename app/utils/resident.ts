export function calculateAgeByIc(ic: string): string {
    const digits = (ic || "").replace(/\D/g, "");
    const today = new Date();
    const currentYear = today.getFullYear();

    if (digits.length >= 6) {
        const yy = parseInt(digits.slice(0, 2), 10);
        const mm = parseInt(digits.slice(2, 4), 10);
        const dd = parseInt(digits.slice(4, 6), 10);
        const cutoff = currentYear % 100; // e.g., 2026 -> 26
        const century = yy <= cutoff ? 2000 : 1900;
        const fullYear = century + yy;

        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            let age = currentYear - fullYear;
            const monthDiff = (today.getMonth() + 1) - mm; 
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dd)) {
                age -= 1;
            }
            return age >= 0 ? age.toString() : "0";
        }

        return (currentYear - fullYear).toString();
    }

    // Fallback: only year available
    const yy = parseInt(digits.slice(0, 2), 10);
    const birthYearPrefix = yy <= (currentYear - 2000) % 100 ? "20" : "19";
    const birthYear = parseInt(birthYearPrefix + String(yy).padStart(2, "0"), 10);
    return (currentYear - birthYear).toString();
}
