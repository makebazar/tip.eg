"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CartRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const tableCode = params.tableCode as string;

  useEffect(() => {
    router.replace(`/t/${tableCode}?tab=cart`);
  }, [router, tableCode]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
      <div style={{ width: "24px", height: "24px", border: "2.5px solid #e2e8f0", borderLeftColor: "#0d9488", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
