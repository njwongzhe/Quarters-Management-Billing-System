"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/Icon/Icon";
import HelpButton from "@/app/components/Layout/ButtonHelp";

type AuthLoginProps = {
    onSwitchToRegister: () => void;
    onForgotPassword: () => void;
};

// This constant defines the key used to remember the login email in localStorage.
const STORAGE_KEY = "auth_login";

// This function loads the remembered login email from localStorage, if available and valid.
function loadRememberedLogin() {
    // If this code is running on the server (during SSR), return default empty values since localStorage is not available.
    if (typeof window === "undefined") 
        return { email: "", password: "", rememberMe: true };

    // Read the saved credentials once during the initial client render.
    const savedLogin = window.localStorage.getItem(STORAGE_KEY);

    // If no saved credentials are found, return default empty values.
    if (!savedLogin)
        return { email: "", password: "", rememberMe: true };

    // If credentials are found, attempt to parse them. 
    // If parsing fails (e.g., due to corruption), clear the saved data and return defaults.
    try {
        const parsedLogin = JSON.parse(savedLogin) as {
            email?: string;
            rememberMe?: boolean;
        };

        if (!parsedLogin.rememberMe) {
            return { email: "", password: "", rememberMe: true };
        }

        return {
            email: parsedLogin.email ?? "",
            password: "",
            rememberMe: true,
        };
    } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return { email: "", password: "", rememberMe: true };
    }
}

export default function AuthLogin({ onSwitchToRegister, onForgotPassword }: AuthLoginProps) {
    // Hook for Navigation
    const router = useRouter();

    // Error Message State
    const [errorMessage, setErrorMessage] = useState("");
    const [errorType, setErrorType] = useState<"error" | "success" | "">("");

    // Login Form State
    const [email, setEmail] = useState(""); 
    const [password, setPassword] = useState(""); 
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Button activation state
    const isLoginAllowed = email.trim().length > 0 && password.length > 0;
    
    // Loading State
    const isLoading = isLoggingIn;

    useEffect(() => {
        const rememberedLogin = loadRememberedLogin(); // Load remembered credentials on initial render.
        if (rememberedLogin.rememberMe) {
            setEmail(rememberedLogin.email);
            setPassword(rememberedLogin.password);
            setRememberMe(true);
        }
    }, []);

    // Helper function to show error or success messages in a consistent way.
    function showMessage(type: "error" | "success", message: string) {
        setErrorType(type);
        setErrorMessage(message);
    }

    // Helper function to handle the login process when the form is submitted.
    async function handleLogin() {
        if (!isLoginAllowed) {
            showMessage("error", "Sila masukkan emel dan kata laluan.");
            return;
        }

        setIsLoggingIn(true);
        try {
            const trimmedEmail = email.trim();
            const loginPassword = password;

            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: trimmedEmail,
                    password: loginPassword,
                    rememberMe,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                const serverError = (result && (result.error || result.message)) || "Log masuk gagal.";

                if (response.status === 404) {
                    showMessage("error", "Akaun belum didaftarkan.");
                } else if (response.status === 401) {
                    showMessage("error", "Kata laluan salah.");
                } else {
                    showMessage("error", serverError);
                }

                return;
            }

            // Save or clear the remembered email only after the login really succeeds.
            if (rememberMe) {
                window.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        email: trimmedEmail,
                        rememberMe: true,
                    })
                );
            } else {
                window.localStorage.removeItem(STORAGE_KEY);
            }

            // The server sets the auth cookie, so the client only needs to continue navigation.
            showMessage("success", "Log masuk berjaya.");
            window.setTimeout(() => {
                router.push("/pages/1_laman_utama");
            }, 300);
        } catch (error) {
            showMessage("error", error instanceof Error ? error.message : "Log masuk gagal.");
        } finally {
            setIsLoggingIn(false);
        }
    }

    return (
        <div className="flex flex-col justify-evenly h-full overflow-auto relative">
            <div className="flex flex-col gap-8">
                <div className="flex flex-row justify-between items-start">
                    {/* Header */}
                    <div className="flex flex-col gap-1">
                        <div className="font-bold text-2xl">Log Masuk ke Sistem</div>
                        <div className="font-light text-sm text-grey">
                            Sila masukkan butiran akaun anda untuk akses.
                        </div>
                    </div>

                    {/* Help Button */}
                    <HelpButton />
                </div>
                
                {errorMessage && (
                    <div className={`flex items-center justify-center font-bold text-sm rounded-lg p-2 ${errorType === "error" ? "bg-red/20 text-red" : "bg-green/20 text-green"}`}>
                        {errorMessage}
                    </div>
                )}  

                {/* Login Form */}
                <form
                    className="flex flex-col gap-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        handleLogin();
                    }}
                >
                    {/* Email Input */}
                    <div className="flex flex-col gap-1">
                        <div className="font-bold text-sm text-grey">Emel</div>
                        <div className="flex flex-row items-center gap-3 rounded-lg border border-transparent bg-light-blue p-3 focus-within:border-black">
                            {/* Email Icon */}
                            <Icon icon="email"></Icon>

                            {/* Email Input Field */}
                            <input
                                type="email"
                                placeholder="nama@johor.gov.my"
                                className="flex-1 bg-transparent outline-none"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="flex flex-col gap-1">
                        <div className="font-bold text-sm text-grey">Kata Laluan</div>
                        <div className="flex flex-row items-center gap-3 rounded-lg border border-transparent bg-light-blue p-3 focus-within:border-black">
                            {/* Password Icon */}
                            <Icon icon="password"></Icon>

                            {/* Password Input Field */}
                            <input
                                type={isPasswordVisible ? "text" : "password"}
                                placeholder="Kata Laluan"
                                className="flex-1 bg-transparent outline-none"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                disabled={isLoading}
                            />

                            {/* Toggle Password Visibility Button */}
                            <button
                                type="button"
                                className="text-grey flex items-center"
                                onClick={() => setIsPasswordVisible((value) => !value)}
                                disabled={isLoading}
                            >
                                <Icon icon={isPasswordVisible ? "visibility" : "visibility_off"}></Icon>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        {/* Ingat Saya */}
                        <div className="flex flex-row items-center gap-1.5">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                className="h-4 w-4 rounded-lg border border-light-grey accent-dark-blue outline-none"
                                checked={rememberMe}
                                onChange={(event) => setRememberMe(event.target.checked)}
                                disabled={isLoading}
                            />
                            <span className="text-sm text-grey">Ingat Saya</span>
                        </div>

                        {/* Lupa Kata Laluan Link */}
                        <button
                            type="button"
                            className="font-bold text-sm text-dark-blue hover:underline"
                            onClick={onForgotPassword}
                            disabled={isLoading}
                        >
                            Lupa Kata Laluan?
                        </button>
                    </div>

                    {/* Login Button */}
                    <button
                        className={
                            `flex justify-center font-bold text-white bg-dark-blue rounded-lg p-2 transition 
                            ${!isLoginAllowed || isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-[0.98] active:scale-[0.96]"}
                        `}
                        disabled={!isLoginAllowed || isLoading}
                    >
                        {isLoading ? "Log Masuk..." : "Log Masuk"}
                    </button>

                    {/* Register Link */}
                    <div className="flex justify-center gap-1">
                        <span className="text-sm text-grey">Belum mempunyai akaun?</span>
                        <button
                            type="button"
                            className="font-bold text-sm text-dark-blue hover:underline"
                            onClick={onSwitchToRegister}
                            disabled={isLoading}
                        >
                            DAFTAR DI SINI
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
