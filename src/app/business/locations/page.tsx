import React from "react";
import { getUserLocations } from "@/app/actions/locations";
import { LocationsClient } from "@/components/LocationsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "TIp Business — Locations",
  description: "Manage your business locations and branches",
};

export default async function BusinessLocationsPage() {
  const result = await getUserLocations();

  if (!result.success || !result.locations || !result.user) {
    redirect("/business/login");
  }

  return (
    <LocationsClient
      locations={result.locations}
      activeBusinessId={result.activeBusinessId || null}
      user={result.user}
    />
  );
}
