"use client";

import { useState } from "react";

import AuthLogin from "./components/AuthLogin";
import AuthRegister from "./components/AuthRegister";
import AuthForgot from "./components/AuthForgot";

type AuthPanel = "login" | "register" | "forgot";

export default function AuthenticationPage() {
  // State to track the active panel. (login, register, forgot)
  const [activePanel, setActivePanel] = useState<AuthPanel>("login");

  // Determine if the forgot password panel is active to adjust the layout and transitions.
  const isForgotPanel = activePanel === "forgot";
  
  // Determine which panel should be shown in the main board area. If forgot password is active, show login panel in the background.
  const boardPanel = isForgotPanel ? "login" : activePanel;

  // When the register panel is active, the board should show the register panel in the foreground. 
  // When the login panel is active, the board should show the login panel in the foreground. 
  // When the forgot password panel is active, the board should show the login panel in the foreground with the register panel in the background.
  const boardClass = boardPanel === "register"
    ? "md:translate-x-0"
    : "md:-translate-x-[36rem]";

  // When the forgot password panel is active, the board should expand to show both the login and register panels. 
  // Otherwise, it should only show one panel at a time.
  const boardWidthClass = isForgotPanel
    ? "md:w-[calc(100%+72rem)]"
    : "md:w-[calc(100%+36rem)]";

  return (
    <div className="relative h-full overflow-hidden bg-white">
      {/* Desktop Layout with Transitioning Panels */}
      <div className={`hidden h-full transition-all duration-250ms ease-[cubic-bezier(0.2,0.8,0.2,1)] md:flex ${boardWidthClass} ${boardClass}`}>
        {/* Register Component */}
        <div className="h-full w-xl shrink-0 bg-white p-6 shadow-2xl">
          <AuthRegister onSwitchToLogin={() => setActivePanel("login")} />
        </div>

        {/* Background Image */}
        <div className="h-full w-[calc(100%-72rem)] shrink-0 transition-all duration-250ms ease-[cubic-bezier(0.2,0.8,0.2,1)]">
          <img
            src="/AuthCover.png"
            alt="Auth cover"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Login Component */}
        <div className="h-full w-xl shrink-0 bg-white p-6 shadow-2xl">
          <AuthLogin
            onSwitchToRegister={() => setActivePanel("register")}
            onForgotPassword={() => setActivePanel("forgot")}
          />
        </div>
      </div>

      {/* Mobile Background Image */}
      <div className="absolute inset-0 md:hidden pointer-events-none">
        <img
          src="/AuthCover.png"
          alt="Auth cover"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Mobile Layout (All Floating Window) */}
      {!isForgotPanel ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 md:hidden">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {activePanel === "register" ? (
              <AuthRegister onSwitchToLogin={() => setActivePanel("login")} />
            ) : (
              <AuthLogin
                onSwitchToRegister={() => setActivePanel("register")}
                onForgotPassword={() => setActivePanel("forgot")}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Forgot Password (Floating Window for Both Mobile and Desktop) */}
      {isForgotPanel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl flex flex-col justify-evenly gap-6">
            <AuthForgot onClose={() => setActivePanel("login")} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
