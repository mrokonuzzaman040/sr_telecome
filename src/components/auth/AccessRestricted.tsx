"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { ShieldAlert, Lock, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";

interface AccessRestrictedProps {
  onBackToSafeTab: () => void;
  requiredRole?: string;
}

export function AccessRestricted({
  onBackToSafeTab,
  requiredRole = "Proprietor / Admin",
}: AccessRestrictedProps) {
  const { currentUser, login } = useStore();
  const [adminPin, setAdminPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleElevateToAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const success = login("admin", adminPin);
    if (!success) {
      setErrorMsg("Invalid Admin PIN. Please enter the correct proprietor PIN (Default: 1234).");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
      <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xl max-w-lg w-full space-y-6">
        {/* Security Badge */}
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl mx-auto flex items-center justify-center text-rose-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Heading & Bengali Note */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
            Access Restricted: This section requires Proprietor/Admin authentication.
          </h2>
          <p className="text-xs text-rose-700 font-medium mt-1">
            এই বিভাগে (লাভ-ক্ষতি ও দোকানের সেটিংস) প্রবেশের জন্য স্বত্বাধিকারী/মালিকের অনুমোদন প্রয়োজন।
          </p>
          <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono">
            <span>Current Session:</span>
            <span className="font-bold text-slate-900">{currentUser?.name}</span>
            <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
              {currentUser?.role}
            </span>
          </div>
        </div>

        {/* Quick Admin Unlock Form */}
        <form onSubmit={handleElevateToAdmin} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs justify-center">
            <KeyRound className="w-4 h-4 text-slate-500" />
            <span>Enter Admin PIN to Unlock This Tab:</span>
          </div>

          <div className="flex items-center gap-2 max-w-xs mx-auto">
            <input
              type="password"
              maxLength={6}
              placeholder="Admin PIN (1234)"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-center font-mono font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition shadow-xs"
            >
              Unlock
            </button>
          </div>

          {errorMsg && <p className="text-rose-600 text-[11px] font-medium">{errorMsg}</p>}
        </form>

        {/* Action Button */}
        <div>
          <button
            onClick={onBackToSafeTab}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to POS Billing (ক্যাশ কাউন্টারে ফিরে যান)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
