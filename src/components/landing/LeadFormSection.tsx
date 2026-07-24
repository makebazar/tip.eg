"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeadFormSection() {
  const [formData, setFormData] = useState({
    venueName: "",
    contactName: "",
    phone: "",
    city: "Cairo",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.venueName) return;
    setSubmitted(true);
  };

  return (
    <section id="register" className="py-16 md:py-24 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 shadow-xl space-y-8 border border-slate-800">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Connect Your Venue
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Submit your venue details. Our team will deliver your QR starter kit and set up your manager portal.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Restaurant / Venue Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kebab El Dahab"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karim Hassan"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+20 100 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                  >
                    <option value="Cairo">Cairo</option>
                    <option value="Giza">Giza</option>
                    <option value="Alexandria">Alexandria</option>
                    <option value="Sharm El Sheikh">Sharm El Sheikh</option>
                    <option value="Hurghada">Hurghada</option>
                    <option value="Other">Other Region</option>
                  </select>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full rounded-xl bg-[#00D26A] hover:bg-[#00B85C] text-slate-950 font-extrabold py-5 text-base gap-2">
                <span>Submit Request</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </Button>
            </form>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-800 text-center space-y-2 max-w-lg mx-auto border border-emerald-500/30">
              <div className="h-10 w-10 rounded-full bg-[#00D26A] text-slate-950 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Request Received</h3>
              <p className="text-xs text-slate-300 font-medium">
                Thank you! Our representative will call your phone ({formData.phone}) shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
