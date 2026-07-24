"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateOwnerAccount } from "@/app/actions/locations";

interface AccountClientProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function AccountClient({ user }: AccountClientProps) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateOwnerAccount(formData);

    setLoading(false);
    if (result.success) {
      setMessage({ type: "success", text: "Account profile updated successfully" });
      setPassword("");
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update profile" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 font-sans pb-16">
      {/* Top Navbar */}
      <header className="w-full sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 py-3.5">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/business/locations" title="Back">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="w-4 h-4" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              Owner Account Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto px-4 sm:px-8 pt-10">
        <Card className="p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{name}</h2>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Badge variant="default">
              Business Owner
            </Badge>
          </div>

          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold ${
                message.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Owner Name / Brand Name
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email (Login)
              </label>
              <Input
                type="email"
                value={user.email}
                disabled
                className="bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">Email is your primary account identifier</p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password (Optional)
              </label>
              <Input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div className="pt-3 flex items-center justify-end">
              <Button type="submit" disabled={loading} variant="default">
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
