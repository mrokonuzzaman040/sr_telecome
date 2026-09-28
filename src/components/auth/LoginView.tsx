"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  User,
  Store,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export function LoginView() {
  const { login, settings } = useStore();
  const [username, setUsername] = useState("admin");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPin, setShowPin] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!pin.trim()) {
      setErrorMsg("Please enter your 4-digit security PIN.");
      return;
    }

    const success = login(username, pin);
    if (!success) {
      setErrorMsg("Invalid username or PIN code. Please try again.");
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg("");
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleQuickAccountSelect = (selectedUser: string, defaultPin: string) => {
    setUsername(selectedUser);
    setPin(defaultPin);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 p-6 text-center text-slate-100 border-b border-slate-800">
          <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl mx-auto flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {settings.shopName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{settings.bengaliShopName}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>POS & Financial System Login</span>
          </div>
        </div>

        {/* Login Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick User Switcher */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Select User Account:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickAccountSelect("admin", "1234")}
                className={`p-2.5 rounded-lg border text-left transition ${
                  username === "admin"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Proprietor / Admin</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    username === "admin" ? "bg-slate-800 text-emerald-400" : "bg-slate-200 text-slate-600"
                  }`}>
                    All Access
                  </span>
                </div>
                <p className={`text-[11px] mt-0.5 ${username === "admin" ? "text-slate-300" : "text-slate-500"}`}>
                  মালিক (মো: রোকনুজ্জামান)
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickAccountSelect("cashier", "5678")}
                className={`p-2.5 rounded-lg border text-left transition ${
                  username === "cashier"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Cashier / Staff</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    username === "cashier" ? "bg-slate-800 text-cyan-400" : "bg-slate-200 text-slate-600"
                  }`}>
                    Sales POS
                  </span>
                </div>
                <p className={`text-[11px] mt-0.5 ${username === "cashier" ? "text-slate-300" : "text-slate-500"}`}>
                  বিক্রয়কর্মী / কাউন্টার
                </p>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Security PIN Code (৪-সংখ্যার পিন):
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2.5 px-3.5 pr-10 text-center font-mono text-xl tracking-widest font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Keypad */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-sm font-mono font-bold text-slate-800 transition"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin("")}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-xs font-medium text-slate-600 transition"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("0")}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-sm font-mono font-bold text-slate-800 transition"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-xs font-medium text-slate-600 transition"
              >
                ⌫ Del
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              <span>Unlock & Enter Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Reminder */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Admin / Proprietor PIN:</span>
              <span className="font-bold text-slate-900">1234</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier / Staff PIN:</span>
              <span className="font-bold text-slate-900">5678</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
