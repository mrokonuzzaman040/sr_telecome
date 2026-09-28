"use client";

import React, { useState, useMemo } from "react";
import { Sale } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatBDT } from "@/utils/formatters";
import { CustomerDetailView } from "./CustomerDetailView";
import {
  Users,
  Search,
  UserPlus,
  History,
  X,
} from "lucide-react";

interface CustomersViewProps {
  onSelectInvoice: (sale: Sale, mode: "thermal" | "a4") => void;
}

export function CustomersView({ onSelectInvoice }: CustomersViewProps) {
  const { customers, addCustomer, showAlert } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "agent" | "single">("all");
  const [dueOnlyFilter, setDueOnlyFilter] = useState(false);

  // When set, replaces the list with a full detail page for this customer
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const viewingCustomer = customers.find((c) => c.id === viewingCustomerId) || null;

  // New Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    type: "agent" as "agent" | "single",
    defaultCommissionRate: 30,
  });

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      if (typeFilter !== "all" && cust.type !== typeFilter) return false;
      if (dueOnlyFilter && cust.currentDue <= 0) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = cust.name.toLowerCase().includes(q);
        const matchesPhone = cust.phone.toLowerCase().includes(q);
        const matchesAddress = cust.address?.toLowerCase().includes(q) ?? false;
        return matchesName || matchesPhone || matchesAddress;
      }
      return true;
    });
  }, [customers, typeFilter, dueOnlyFilter, searchQuery]);

  // Aggregate metrics
  const totalDueOutstanding = customers.reduce((acc, c) => acc + c.currentDue, 0);
  const totalAgentDue = customers.filter((c) => c.type === "agent").reduce((acc, c) => acc + c.currentDue, 0);
  const totalRetailDue = customers.filter((c) => c.type === "single").reduce((acc, c) => acc + c.currentDue, 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      showAlert("Please enter both customer name and phone.", {
        title: "Missing Information",
        type: "warning",
      });
      return;
    }

    addCustomer({
      name: customerForm.name,
      phone: customerForm.phone,
      address: customerForm.address,
      type: customerForm.type,
      defaultCommissionRate: customerForm.type === "agent" ? customerForm.defaultCommissionRate : 0,
    });

    setIsAddCustomerOpen(false);
    setCustomerForm({
      name: "",
      phone: "",
      address: "",
      type: "agent",
      defaultCommissionRate: 30,
    });
  };

  if (viewingCustomer) {
    return (
      <CustomerDetailView
        customer={viewingCustomer}
        onBack={() => setViewingCustomerId(null)}
        onSelectInvoice={onSelectInvoice}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Customers (মোট গ্রাহক)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {customers.length} ({customers.filter((c) => c.type === "agent").length} Agents)
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold block">
            Total Outstanding Due (মোট বকেয়া)
          </span>
          <span className="font-bold text-lg font-mono text-rose-700 mt-1 block">
            {formatBDT(totalDueOutstanding)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-semibold block">
            Agent Due (এজেন্টদের বকেয়া)
          </span>
          <span className="font-bold text-lg font-mono text-indigo-800 mt-1 block">
            {formatBDT(totalAgentDue)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold block">
            Retail Customers Due (খুচরা বাকি)
          </span>
          <span className="font-bold text-lg font-mono text-slate-800 mt-1 block">
            {formatBDT(totalRetailDue)}
          </span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Accounts (সকল একাউন্ট)</option>
            <option value="agent">Agents Only (বই এজেন্ট)</option>
            <option value="single">Retail Customers (খুচরা গ্রাহক)</option>
          </select>

          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700">
            <input
              type="checkbox"
              checked={dueOnlyFilter}
              onChange={(e) => setDueOnlyFilter(e.target.checked)}
              className="rounded text-slate-900 focus:ring-0"
            />
            <span>Has Due Only (বাকি আছে)</span>
          </label>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Customer / Agent</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Customer / Shop Name</th>
                <th className="py-2.5 px-3">Contact & Address</th>
                <th className="py-2.5 px-3">Account Type</th>
                <th className="py-2.5 px-3 text-center">Commission Rate</th>
                <th className="py-2.5 px-3 text-right">Total Purchased</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Current Due (বাকি)</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No customer accounts found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasDue = cust.currentDue > 0;

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setViewingCustomerId(cust.id)}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {cust.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="font-mono text-slate-700">{cust.phone}</div>
                        {cust.address && (
                          <div className="text-[11px] text-slate-400">{cust.address}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            cust.type === "agent"
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {cust.type === "agent" ? "Agent (পাইকারি)" : "Retail"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                        {cust.type === "agent" ? `${cust.defaultCommissionRate ?? 30}%` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatBDT(cust.totalPurchased)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {formatBDT(cust.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            hasDue
                              ? "bg-rose-100 text-rose-800"
                              : "text-slate-400 font-normal"
                          }`}
                        >
                          {formatBDT(cust.currentDue)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingCustomerId(cust.id);
                            }}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                            title="View Customer Ledger (খতিয়ান)"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ADD NEW CUSTOMER MODAL ================= */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-900" />
                <h3 className="font-semibold text-sm text-slate-900">Add Customer or Agent</h3>
              </div>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Account Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerForm((p) => ({ ...p, type: "agent" }))}
                    className={`py-2 rounded border text-center font-medium transition ${
                      customerForm.type === "agent"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Agent (পাইকারি বই বিক্রেতা)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerForm((p) => ({ ...p, type: "single" }))}
                    className={`py-2 rounded border text-center font-medium transition ${
                      customerForm.type === "single"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Retail Customer (খুচরা)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Name / দোকান বা গ্রাহকের নাম:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Madina Book House or Kabir Hossain"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Mobile / ফোন নম্বর:</label>
                <input
                  type="tel"
                  required
                  placeholder="017XXXXXXXX"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Address / ঠিকানা:</label>
                <input
                  type="text"
                  placeholder="বাজার রোড, থানা সদর"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
                />
              </div>

              {customerForm.type === "agent" && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Wholesale Commission Rate (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={customerForm.defaultCommissionRate}
                    onChange={(e) =>
                      setCustomerForm((p) => ({
                        ...p,
                        defaultCommissionRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-center focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
