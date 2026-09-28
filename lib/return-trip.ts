import type { Contract } from "@/lib/types";
import type { ContractFormPayload } from "@/app/_actions/contract";

interface ReturnTripSelection {
  tripDate: string;
  tripTime: string;
  captainId: string;
  vehiclePlate: string;
}

/** Called only after the operator confirms the new vehicle inspection in the form. */
export function returnTripPayload(source: Contract, selection: ReturnTripSelection): ContractFormPayload {
  return {
    ...selection,
    issueDate: selection.tripDate,
    operationType: source.operationType,
    origin: source.destination,
    destination: source.origin,
    customerName: source.customerName,
    customerPhone: source.customerPhone || undefined,
    notes: `رحلة عودة للعقد ${source.referenceNumber}`,
    passengers: (source.passengers || []).map(({ name, nationality, idNumber }) => ({ name, nationality, idNumber })),
    inspectionData: {
      inspectionDate: selection.tripDate,
      fuelGauge: true, tempGauge: true, oilPressure: true, checkEngine: true,
      absLight: true, warningLights: true, tires: true, headlights: true,
      signals: true, mirrors: true, noLeaks: true, fireExtinguisher: true,
      warningTriangle: true, firstAidKit: true, glassHammer: true, seatBelts: true,
      driverDeclared: true,
      notes: `فحص فعلي مؤكد من الإدارة عند إنشاء رحلة العودة للعقد ${source.referenceNumber}`,
    },
  };
}
