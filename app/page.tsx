"use client";
import { useUiText } from "@/lib/ui-text";


import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { defaultAdminRoute } from "@/lib/permissions";

export default function RootPage() {
  const ui = useUiText();

  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "ADMIN") {
        router.push(defaultAdminRoute(user));
      } else if (user.role === "CAPTAIN") {
        router.push("/captain");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[var(--accent-gold)]/25 border-t-[var(--accent-gold)] rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          {ui("جاري التوجيه إلى مساحة العمل...")}</p>
      </div>
    </div>
  );
}
