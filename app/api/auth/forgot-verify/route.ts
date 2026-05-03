import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
	try {
		const { email, otp, password } = await request.json();

		// Verify the OTP that was sent for password recovery.
		const { data, error } = await supabase.auth.verifyOtp({
			email,
			token: otp,
			type: "recovery",
		});

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Use the verified session to update the password immediately.
		if (data.session) {
			await supabase.auth.setSession(data.session);
			const { error: updateError } = await supabase.auth.updateUser({ password });

			if (updateError) {
				return NextResponse.json({ error: updateError.message }, { status: 400 });
			}
		}

		return NextResponse.json({ message: "Password berjaya ditetapkan semula." });
	} catch (error: unknown) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}