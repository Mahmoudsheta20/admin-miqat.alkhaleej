import type { ReactNode } from "react";
import PublicControls from "./public-controls";
export default function VerificationLayout({ children }: { children: ReactNode }) {
  return <><PublicControls />{children}</>;
}
