"use client";

import { useState } from "react";

import Icon from "@/app/components/Icon";
import HelpButton from "@/app/components/button-help";

type AuthForgotProps = {
	onClose: () => void;
};

export default function AuthForgot({ onClose }: AuthForgotProps) {
	// Error Message State
	const [errorMessage, setErrorMessage] = useState("");
	const [errorType, setErrorType] = useState<"error" | "success" | "">("");

	// Form State
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isConfirmVisible, setIsConfirmVisible] = useState(false);
	const [isOtpSent, setIsOtpSent] = useState(false);
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isResettingPassword, setIsResettingPassword] = useState(false);

	// Validation
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const isEmailValid = emailPattern.test(email.trim().toLowerCase());
	const isPasswordValid = password.length >= 8;
	const isPasswordMatch = password === confirmPassword;
	const isOtpValid = /^\d{6}$/.test(otp);
	const isOtpAllowed = isEmailValid; // OTP can be sent only after email is valid.
	const isResetPasswordAllowed = isEmailValid && isOtpValid && isPasswordValid && isPasswordMatch && isOtpSent;

	// Loading State
	const isLoading = isSendingOtp || isResettingPassword;

	// Helper function to show error or success messages.
	function showMessage(type: "error" | "success", message: string) {
		setErrorType(type);
		setErrorMessage(message);
	}

	// Helper function to request OTP for password reset.
	async function handleSendOtp() {
		if (!isOtpAllowed) {
			showMessage("error", "Sila masukkan alamat emel dengan betul.");
			return;
		}

		setIsSendingOtp(true);
		try {
			const response = await fetch("/api/auth/forgot-get-otp", {
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

	// Helper function to reset password after OTP verification.
	async function handleResetPassword() {
		if (!isOtpSent) {
			showMessage("error", "Sila dapatkan OTP terlebih dahulu.");
			return;
		}

		if (!isResetPasswordAllowed) {
			showMessage("error", "Sila lengkapkan semua butiran dengan betul.");
			return;
		}

		setIsResettingPassword(true);
		try {
			const response = await fetch("/api/auth/forgot-verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: email.trim(),
					otp,
					password,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error("Gagal menetapkan semula kata laluan.");
			}

			showMessage("success", "Kata laluan berjaya ditetapkan semula.");
			setTimeout(() => onClose(), 800);
		} catch (error) {
			showMessage("error", error instanceof Error ? error.message : "Gagal menetapkan semula kata laluan.");
		} finally {
			setIsResettingPassword(false);
		}
	}

	return (
		<div className="flex flex-col justify-evenly h-full overflow-auto relative">
			<div className="flex flex-col gap-8">
				<div className="flex flex-row justify-between items-start">
					{/* Header */}
					<div className="flex flex-col gap-1">
						<div className="font-bold text-2xl">Lupa Kata Laluan</div>
						<div className="font-light text-sm text-grey">
							Sila lengkapkan butiran di bawah untuk tetapkan semula kata laluan.
						</div>
					</div>

					{/* Help Button */}
					<HelpButton />
				</div>
				
				{/* Error/Success Messages */}
				{errorMessage && (
					<div className={`flex flex-1 items-center justify-center font-bold text-sm rounded-lg p-2 ${errorType === "error" ? "text-red bg-red/20" : "text-green bg-green/20"}`}>
						{errorMessage}
					</div>
				)}

				{/* Forgot Password Form */}
				<form
					className="flex flex-col gap-5"
					onSubmit={(event) => {
						event.preventDefault();
						handleResetPassword();
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
											setPassword("");
											setConfirmPassword("");
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
							{!isEmailValid && email.length > 0 && (<div className="text-sm text-red">Emel tidak sah.</div>)}
						</div>
					</div>

					{isOtpSent ? (
						<>
							{/* Verification Code */}
							<div className="flex flex-col gap-1">
								<div className="font-bold text-sm text-grey">Kod Pengesahan</div>
								<div
									className={`
										flex flex-row items-center gap-3 border rounded-lg bg-light-blue p-3 
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
											input.value = input.value.replace(/[^0-9]/g, "");
										}}
										onChange={(e) => setOtp(e.target.value)}
										disabled={isLoading}
									/>
								</div>

								{/* OTP Validation Message */}
								{!isOtpValid && otp.length > 0 && (<div className="text-sm text-red">OTP tidak sah. Pastikan 6 digit angka.</div>)}
							</div>

							{/* New Password */}
							<div className="flex flex-row gap-4">
								<div className="flex flex-col gap-1 flex-1">
									<div className="font-bold text-sm text-grey">Kata Laluan Baharu</div>
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

									{/* Password Validation Message */}
									{!isPasswordValid && password.length > 0 && (<div className="text-sm text-red">Sekurang-kurangnya 8 aksara.</div>)}
								</div>

								<div className="flex flex-col gap-1 flex-1">
									<div className="font-bold text-sm text-grey">Sahkan Kata Laluan Baharu</div>
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
											onChange={(event) => setConfirmPassword(event.target.value)}
											disabled={isLoading}
										/>

										{/* Toggle Confirm Password Visibility Button */}
										<button
											type="button"
											className="text-grey flex items-center"
											onClick={() => setIsConfirmVisible((value) => !value)}
											disabled={isLoading}
										>
											<Icon
												icon={isConfirmVisible ? "visibility" : "visibility_off"}
											></Icon>
										</button>
									</div>

									{/* Password Mismatch Error Message */}
									{!isPasswordMatch && confirmPassword.length > 0 && (<div className="text-sm text-red">Kata laluan tidak sepadan.</div>)}
								</div>
							</div>

							{/* Reset Button */}
							<button
								type="submit"
								className={`
									flex justify-center font-bold text-white bg-dark-blue rounded-lg p-2
									${!isResetPasswordAllowed || isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-[0.98] active:scale-[0.96]"}
								`}
								disabled={isLoading}
							>
								{isResettingPassword ? "Menetapkan..." : "Tetapkan Semula"}
							</button>
						</>
					) : null}

					{/* Login Link */}
					<div className="flex justify-center gap-1">
						<span className="text-sm text-grey">Sudah ingat kata laluan?</span>
						<button
							type="button"
							className="font-bold text-sm text-dark-blue hover:underline"
							onClick={onClose}
						>
							LOG MASUK
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
