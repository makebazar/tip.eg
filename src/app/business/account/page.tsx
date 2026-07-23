import React from "react";
import { getUserLocations } from "@/app/actions/locations";
import { AccountClient } from "@/components/AccountClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "TIp Business — Account Settings",
  description: "Manage your owner account profile and security",
};

export default async function BusinessAccountPage() {
  const result = await getUserLocations();

  if (!result.success || !result.user) {
    redirect("/business/login");
  }

  return <AccountClient user={result.user} />;
}
