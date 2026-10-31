import type { ReactNode } from "react";
import DashboardShell from "@/app/_components/DashboardShell";
import { WorkspaceModeProvider } from "@/lib/workspaceModeContext";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceModeProvider>
      <DashboardShell role="ADMIN">{children}</DashboardShell>
    </WorkspaceModeProvider>
  );
}
