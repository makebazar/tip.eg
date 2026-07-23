import React from "react";
import { getInviteDetails } from "@/app/actions/invites";
import { InviteAcceptClient } from "@/components/InviteAcceptClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "TIp Business — Join Venue",
  description: "Accept invitation link to join business venue",
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function BusinessInvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const result = await getInviteDetails(token);

  if (!result.success || !result.invite) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md shadow-xs">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Invitation Link</h2>
          <p className="text-xs text-slate-500 mb-6">
            This invitation link is invalid, expired, or has been reset by the business owner.
          </p>
          <a
            href="/business/login"
            className="inline-block bg-[#B58A1C] text-white px-5 py-2.5 rounded-xl font-bold text-sm"
          >
            Go to Business Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <InviteAcceptClient
      token={token}
      invite={result.invite}
      currentUser={result.currentUser || null}
    />
  );
}
