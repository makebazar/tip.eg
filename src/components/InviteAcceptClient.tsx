"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { acceptInvite } from "@/app/actions/invites";
import { useRouter } from "next/navigation";

interface InviteAcceptClientProps {
  token: string;
  invite: {
    token: string;
    role: "MANAGER" | "STAFF";
    business_id: string;
    business_name: string;
    city?: string;
    business_type?: string;
  };
  currentUser: { id: string; name: string; email: string } | null;
}

export function InviteAcceptClient({ token, invite, currentUser }: InviteAcceptClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAcceptLoggedIn = async () => {
    setLoading(true);
    setError(null);
    const result = await acceptInvite(token);
    setLoading(false);

    if (result.success && result.redirectUrl) {
      router.push(result.redirectUrl);
    } else {
      setError(result.error || "Failed to accept invitation");
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await acceptInvite(token, formData);
    setLoading(false);

    if (result.success && result.redirectUrl) {
      router.push(result.redirectUrl);
    } else {
      setError(result.error || "Failed to accept invitation");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 font-sans flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2 border-b border-slate-100 pb-6">
          <Badge variant="default" className="uppercase text-[11px] font-bold tracking-wider">
            {invite.role === "MANAGER" ? "Location Manager Invite" : "Staff Team Invite"}
          </Badge>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Join {invite.business_name}
          </h1>
          {invite.city && <p className="text-xs text-slate-500">{invite.city}</p>}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {currentUser ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Logged in as <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.email})
            </div>
            <Button
              onClick={handleAcceptLoggedIn}
              disabled={loading}
              variant="default"
              className="w-full h-11 text-base font-bold"
            >
              {loading ? "Accepting..." : `Accept & Join ${invite.business_name}`}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRegisterAndAccept} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Email <span className="text-[#B58A1C]">*</span>
              </label>
              <Input
                name="email"
                type="email"
                required
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Name
              </label>
              <Input
                name="name"
                placeholder="e.g. Alex Smith"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-[#B58A1C]">*</span>
              </label>
              <Input
                name="password"
                type="password"
                required
                placeholder="Create a secure password"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                variant="default"
                className="w-full h-11 text-base font-bold"
              >
                {loading ? "Joining..." : `Create Account & Join ${invite.business_name}`}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
