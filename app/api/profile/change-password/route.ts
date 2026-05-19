import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getCurrentAdmin } from "@/lib/auth/current-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: Request) {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, message: "Sesi tamat tempoh. Sila log masuk semula." },
        { status: 401 },
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, message: "Konfigurasi Supabase tidak lengkap." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Kata laluan semasa dan kata laluan baharu minimum 8 aksara diperlukan.",
        },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
      email: currentAdmin.profile.email,
      password: currentPassword,
      });

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { success: false, message: "Kata laluan semasa tidak tepat." },
        { status: 400 },
      );
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });

    if (sessionError) {
      return NextResponse.json(
        { success: false, message: sessionError.message },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kata laluan berjaya ditukar.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal menukar kata laluan.",
      },
      { status: 500 },
    );
  }
}
