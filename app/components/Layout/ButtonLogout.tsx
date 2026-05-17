"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Icon from "../Icon/Icon";
import { ROUTES } from "../../constants/routes";

export default function ButtonLogout() {
	const router = useRouter();
	const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
	const cancelButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isLogoutDialogOpen) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsLogoutDialogOpen(false);
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		cancelButtonRef.current?.focus();

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isLogoutDialogOpen]);

	function openLogoutDialog() {
		setIsLogoutDialogOpen(true);
	}

	function closeLogoutDialog() {
		setIsLogoutDialogOpen(false);
	}

	// Helper function to handle logout by calling the API route and then redirecting to the login page.
	async function handleLogout() {
		try {
			await fetch("/api/auth/logout", {
				method: "POST",
			});

			// Redirect to login page after logout.
			router.push(ROUTES.auth);
		} catch (error) {
			console.error("Logout failed:", error);
		} finally {
			closeLogoutDialog();
		}
	}

	return (
		<>
			{/* Logout Button */}
			<button
				type="button"
				className="material-symbols-outlined text-red hover:cursor-pointer hover:text-dark-blue hover:scale-[0.98] active:scale-[0.86]"
				onClick={openLogoutDialog}
				title="Logout"
				aria-haspopup="dialog"
				aria-expanded={isLogoutDialogOpen}
			>
				<Icon icon="logout" size={24} />
			</button>

			{/* Logout Confirmation Dialog */}
			{isLogoutDialogOpen ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-dark-blue/35 p-4 backdrop-blur-[2px]"
					role="dialog"
					aria-modal="true"
					aria-labelledby="logout-dialog-title"
					onClick={(event) => {
						if (event.target === event.currentTarget) {
							closeLogoutDialog();
						}
					}}
				>
					<div className="w-full max-w-md rounded-2xl border border-light-blue bg-white p-4 shadow-2xl">
						<div className="flex items-start gap-4">
							{/* Icon */}
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red/10 text-red">
								<Icon icon="logout" size={24} />
							</div>

							{/* Dialog Content */}
							<div className="space-y-2">
								<p className="text-xs font-extrabold text-grey">
									LOG KELUAR
								</p>
								<h2
									id="logout-dialog-title"
									className="text-2xl font-extrabold text-dark-blue"
								>
									Adakah Anda Pasti Ingin Log Keluar?
								</h2>
								<p className="text-sm font-medium text-grey">
									Anda akan dikeluarkan dari peranti ini dan dihantar kembali ke skrin log masuk.
								</p>
							</div>
						</div>

						{/* Dialog Actions */}
						<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							{/* Cancel Button */}
							<button
								ref={cancelButtonRef}
								type="button"
								className="inline-flex min-h-11 items-center justify-center rounded-xl border border-light-grey/30 bg-white px-5 py-2.5 text-sm font-semibold text-dark-blue transition-colors hover:bg-background hover:scale-[0.98] active:scale-[0.96]"
								onClick={closeLogoutDialog}
							>
								Cancel
							</button>

							{/* Confirm Logout Button */}
							<button
								type="button"
								className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 hover:scale-[0.98] active:scale-[0.96]"
								onClick={handleLogout}
							>
								Sign out
							</button>
						</div>
					</div>
				</div>
				) : null}
		</>
	);
}
