"use client";
import { useAuth } from "@/lib/authContext";
import { useUiText } from "@/lib/ui-text";
import { commercialRequest } from "@/lib/commercial";
import { Notice, SECONDARY, useMutation } from "./shared";

export default function ReportTripButton({ contractId }: { contractId: string }) {
  const { user } = useAuth();
  const ui = useUiText();
  const m = useMutation();

  return (
    <div>
      <button
        type="button"
        disabled={m.busy || Boolean(m.message)}
        className={SECONDARY}
        onClick={() =>
          void m.run(() =>
            commercialRequest(`/captains/${user?.id}/report-trip/${contractId}`, "POST", {}),
          )
        }
      >
        {ui(m.message ? "تم إبلاغ المسؤول" : "الإبلاغ عن تنفيذ الرحلة")}
      </button>
      <Notice message={m.error} error />
    </div>
  );
}
