"use client";

import { useState } from "react";
import Icon from "@/app/components/Icon";

type AuthRegisterProps = {
	onSwitchToLogin: () => void;
};

export default function AuthRegister({ onSwitchToLogin }: AuthRegisterProps) {
	// Error Message State
	const [errorMessage, setErrorMessage] = useState("");
	const [errorType, setErrorType] = useState<"error" | "success" | "">("");

	// Email State & Validation
	const [email, setEmail] = useState("");
    const domainRestriction = false; // Set to true to enforce domain restriction.
    const targetDomain = "@johor.gov.my"; // Only allow emails ending with this domain if domainRestriction is true.
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const normalizedEmail = email.trim().toLowerCase();
    const isDomainValid = !domainRestriction || normalizedEmail.endsWith(targetDomain); // If domain restriction is disabled, all emails are considered valid. If enabled, only emails ending with targetDomain are valid.
	const isEmailValid = emailPattern.test(normalizedEmail) && isDomainValid; 

	// OTP State
	const [otp, setOtp] = useState("");
	const [isOtpSent, setIsOtpSent] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
	const isOtpAllowed = isEmailValid; // Getting OTP only needs a valid email.
	const isOtpValid = /^\d{6}$/.test(otp); // Simple check for 6 digit OTP.

    // Name State & Validation
	const [name, setName] = useState("");
	const isNameValid = name.trim().length > 0; // Name must not be empty.

	// Password State & Validation
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isConfirmVisible, setIsConfirmVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const isPasswordValid = password.length >= 8; // Minimum 8 characters.
	const isPasswordMatch = password === confirmPassword;

	// Overall Form Validity
	// Form is valid if all individual validations pass.
	const isFormValid = isNameValid && isPasswordValid && isPasswordMatch && isEmailValid && isOtpValid && isOtpSent;

	// Loading State
	const isLoading = isSendingOtp || isVerifyingOtp;

    // Helper function to show error or success messages.
	function showMessage(type: "error" | "success", message: string) {
		setErrorType(type);
		setErrorMessage(message);
	}

    // Helper function to handle sending OTP.
	async function handleSendOtp() {
		if (!isOtpAllowed) {
			showMessage("error", isDomainValid ? "Emel tidak sah." : `Emel mesti berakhir dengan ${targetDomain}.`);
			return;
		}

		setIsSendingOtp(true);
		try {
			const response = await fetch("/api/auth/register-get-otp", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: email.trim(),
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error("Gagal menghantar OTP.");
			}

			setIsOtpSent(true);
			showMessage("success", "OTP berjaya dihantar. Semak SPAM jika tiada dalam inbox.");
		} catch (error) {
			showMessage("error", error instanceof Error ? error.message : "Gagal menghantar OTP.");
		} finally {
			setIsSendingOtp(false);
		}
	}

    // Helper function to handle OTP verification and registration.
	async function handleVerifyRegister() {
		if (!isOtpSent) {
			showMessage("error", "Sila dapatkan OTP terlebih dahulu.");
			return;
		}

		if (!isFormValid) {
			showMessage("error", "Sila lengkapkan semua butiran dengan betul.");
			return;
		}

		setIsVerifyingOtp(true);
		try {
			const response = await fetch("/api/auth/register-verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
                    fullName: name.trim(),
					email: email.trim(),
                    password: password,
					otp,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error("OTP tidak sah.");
			}

			showMessage("success", "Pendaftaran berjaya!");
			setTimeout(() => onSwitchToLogin(), 800);
		} catch (error) {
			showMessage("error", error instanceof Error ? error.message : "OTP tidak sah.");
		} finally {
			setIsVerifyingOtp(false);
		}
	}

	return (
		<div className="flex flex-col justify-evenly h-full overflow-auto">
			<div className="flex flex-col gap-8">
				{/* Header */}
				<div className="flex flex-col gap-1">
					<div className="font-bold text-2xl">Daftar Akaun Baharu</div>
					<div className="font-light text-sm text-grey">
						Sila lengkapkan butiran di bawah untuk pendaftaran.
					</div>
				</div>

				{/* Error Messages */}
				{errorMessage && (
					<div className={`flex flex-1 items-center justify-center font-bold text-sm rounded-lg p-2 ${errorType === "error" ? "text-red bg-red/20" : "text-green bg-green/20"}`}>
						{errorMessage}
					</div>
				)}

				{/* Register Form */}
				<form 
                    className="flex flex-col gap-5" 
                    onSubmit={(event) => {
                        event.preventDefault();
                        handleVerifyRegister();
				    }}
                >
                    {/* Email + Send OTP */}
					<div className="flex flex-row items-end gap-4">
						<div className="flex flex-col gap-1 flex-1">
							<div className="font-bold text-sm text-grey">Alamat Emel</div>
							<div className="flex flex-row justify-around items-center gap-3">
								{/* Email Input */}
								<div 
									className={`
										flex flex-row flex-1 items-center gap-3 rounded-lg border bg-light-blue p-3 
                                        ${!isEmailValid && email.length > 0 ? "border-red focus-within:border-red" : "border-transparent focus-within:border-black"}
									`}
								> 	
									{/* Email Icon */}
									<Icon icon="email"></Icon>

									{/* Email Input Field */}
									<input
										type="email"
										placeholder="nama@johor.gov.my"
										className="w-full bg-transparent outline-none"
										value={email}
										onChange={(e) => {
											setEmail(e.target.value);
											setOtp("");
											setIsOtpSent(false);
										}}
										disabled={isLoading}
									/>
								</div>

								{/* Send OTP Button */}
								<button
									type="button"
									className={`
                                        rounded-lg bg-dark-blue px-4 py-3 font-bold text-sm text-white 
                                        ${!isOtpAllowed || isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-[0.98] active:scale-[0.96]"}
                                    `}
									disabled={isLoading}
									onClick={handleSendOtp}
								>
									{isSendingOtp ? "Menghantar..." : "Hantar OTP"}
								</button>
							</div>
							
							{/* Email Validation Message */}
							{!isEmailValid && email.length > 0 && (isDomainValid ? <div className="text-sm text-red">Emel tidak sah.</div> : <div className="text-sm text-red">Emel mesti berakhir dengan {targetDomain}.</div>)}
						</div>
					</div>

					{isOtpSent ? (
						<>
							{/* Verification Code */}
							<div className="flex flex-col gap-1">
								<div className="font-bold text-sm text-grey">Kod Pengesahan</div>
								<div className={`
										flex flex-row items-center gap-3 border rounded-lg bg-light-blue p-3 focus-within:border-black
										${!isOtpValid && otp.length > 0 ? "border-red focus-within:border-red" : "border-transparent focus-within:border-black"}
									`}
								>
									{/* OTP Icon */}
									<Icon icon="sms"></Icon>

									{/* OTP Input Field */}
									<input
										type="text"
										inputMode="numeric"
										maxLength={6} 
		  								pattern="\d{6}"
										placeholder="Masukkan OTP 6 Digit"
										className="w-full bg-transparent text-center outline-none"
										value={otp}
										onInput={(e) => {
											const input = e.target as HTMLInputElement;
											input.value = input.value.replace(/[^0-9]/g, '');
										}}
										onChange={(e) => setOtp(e.target.value)}
										disabled={isLoading}
									/>
								</div>
		                        
		                        {/* OTP Validation Message */}
		                        {!isOtpValid && otp.length > 0 && (<div className="text-sm text-red">OTP tidak sah. Pastikan 6 digit angka.</div>)}
							</div>

							{/* Full Name */}
							<div className="flex flex-col gap-1">
								<div className="font-bold text-sm text-grey">Nama Penuh</div>
								<div className="flex flex-row items-center gap-3 rounded-lg border border-transparent bg-light-blue p-3 focus-within:border-black">
									{/* Full Name Icon */}
									<Icon icon="person"></Icon>

									{/* Full Name Input Field */}
									<input
										type="text"
										placeholder="Masukkan Nama Penuh"
										className="w-full bg-transparent outline-none"
										value={name}
		                                onChange={(e) => setName(e.target.value)}
		                                disabled={isLoading}
								    />
								</div>
							</div>

							{/* Password + Confirm Password */}
							<div className="flex flex-row gap-4">
		                        {/* Password */}
								<div className="flex flex-col gap-1 flex-1">
									<div className="font-bold text-sm text-grey">Kata Laluan</div>
									<div 
										className={`
											flex flex-row items-center gap-3 rounded-lg border bg-light-blue p-3 
		                                    ${!isPasswordValid && password.length > 0 ? "border-red focus-within:border-red" : "border-transparent focus-within:border-black"}
		                                `}
									>
										{/* Password Icon */}   
										<Icon icon="password"></Icon>

										{/* Password Input Field */}
										<input
											type={isPasswordVisible ? "text" : "password"}
											placeholder="Kata Laluan"
											className="w-full bg-transparent outline-none"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
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

									{/* Password Validation Message */}
									{!isPasswordValid && password.length > 0 && (<div className="text-sm text-red">Sekurang-kurangnya 8 aksara.</div>)}
								</div>

		                        {/* Confirm Password */}
								<div className="flex flex-col gap-1 flex-1">
									<div className="font-bold text-sm text-grey">Sahkan Kata Laluan</div>
									<div
										className={`
											flex flex-row items-center gap-3 rounded-lg border bg-light-blue p-3 
		                                    ${!isPasswordMatch && confirmPassword.length > 0 ? "border-red focus-within:border-red" : "border-transparent focus-within:border-black"}
		                                `}
									>
										{/* Confirm Password Icon */}
										<Icon icon="password"></Icon>

										{/* Confirm Password Input Field */}
										<input
											type={isConfirmVisible ? "text" : "password"}
											placeholder="Ulangkan"
											className="w-full bg-transparent outline-none"
											value={confirmPassword}
											onChange={(e) => {setConfirmPassword(e.target.value);}}
		                                    disabled={isLoading}
		                                />

		                                {/* Toggle Confirm Password Visibility Button */}
		                                <button
		                                    type="button"
		                                    className="text-grey flex items-center"
		                                    onClick={() => setIsConfirmVisible((value) => !value)}
		                                    disabled={isLoading}
		                                >
		                                    <Icon icon={isConfirmVisible ? "visibility" : "visibility_off"}></Icon>
										</button>
									</div>

									{/* Password Mismatch Error Message */}
									{!isPasswordMatch && confirmPassword.length > 0 && (<div className="text-sm text-red">Kata laluan tidak sepadan.</div>)}
								</div>
							</div>

							{/* Register Button */}
		                    <button
		                        type="submit"
		                        className={`
		                            flex justify-center font-bold text-white bg-dark-blue rounded-lg p-2
		                            ${!isFormValid || isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-[0.98] active:scale-[0.96]"}
		                        `}
		                        disabled={isLoading}
		                    >
		                        {isVerifyingOtp ? "Mengesahkan..." : "Daftar Akaun"}
		                    </button>
						</>
					) : null}

                    {/* Login Link */}
                    <div className="flex justify-center gap-1">
                        <span className="text-sm text-grey">Sudah mempunyai akaun?</span>
                        <button
                            type="button"
                            className="font-bold text-sm text-dark-blue hover:underline"
                            onClick={onSwitchToLogin}
                        >
                            LOG MASUK
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
