"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Check install status first
    api
      .getInstallStatus()
      .then((res) => {
        if (!res.data?.installed) {
          router.replace("/install");
        } else if (user) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        // If the install-status API fails, try normal flow
        router.replace(user ? "/dashboard" : "/login");
      })
      .finally(() => setChecked(true));
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
