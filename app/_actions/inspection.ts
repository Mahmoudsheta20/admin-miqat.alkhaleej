"use server";

import { prisma } from "@/lib/prisma";
import { VehicleInspection } from "@/lib/types";

export interface InspectionInput {
  captainId: string;
  vehiclePlate: string;
  fuelGauge: boolean;
  tempGauge: boolean;
  oilPressure: boolean;
  checkEngine: boolean;
  absLight: boolean;
  warningLights: boolean;
  tires: boolean;
  headlights: boolean;
  signals: boolean;
  mirrors: boolean;
  noLeaks: boolean;
  fireExtinguisher: boolean;
  warningTriangle: boolean;
  firstAidKit: boolean;
  glassHammer: boolean;
  seatBelts: boolean;
  driverDeclared: boolean;
  notes?: string;
}

export async function getTodayInspection(
  captainId: string
): Promise<{ success: boolean; inspection?: VehicleInspection | null; error?: string }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.vehicleInspection.findFirst({
      where: {
        captainId,
        createdAt: { gte: today },
      },
      orderBy: { createdAt: "desc" },
      include: {
        captain: { select: { name: true } },
      },
    });

    if (!record) {
      return { success: true, inspection: null };
    }

    return {
      success: true,
      inspection: {
        id: record.id,
        captainId: record.captainId,
        captainName: record.captain?.name,
        vehiclePlate: record.vehiclePlate,
        inspectionDate: record.inspectionDate.toISOString().split("T")[0],
        fuelGauge: record.fuelGauge,
        tempGauge: record.tempGauge,
        oilPressure: record.oilPressure,
        checkEngine: record.checkEngine,
        absLight: record.absLight,
        warningLights: record.warningLights,
        tires: record.tires,
        headlights: record.headlights,
        signals: record.signals,
        mirrors: record.mirrors,
        noLeaks: record.noLeaks,
        fireExtinguisher: record.fireExtinguisher,
        warningTriangle: record.warningTriangle,
        firstAidKit: record.firstAidKit,
        glassHammer: record.glassHammer,
        seatBelts: record.seatBelts,
        driverDeclared: record.driverDeclared,
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Get today inspection error:", error);
    return { success: false, error: "تعذر جلب بيانات الفحص اليومي" };
  }
}

export async function submitInspection(
  data: InspectionInput
): Promise<{ success: boolean; inspection?: VehicleInspection; error?: string }> {
  try {
    if (!data.driverDeclared) {
      return { success: false, error: "يجب الموافقة على الإقرار والتعهد قبل إرسال الفحص" };
    }

    const captain = await prisma.user.findUnique({ where: { id: data.captainId } });
    if (!captain) {
      return { success: false, error: "الكابتن غير مسجل في النظام" };
    }

    const created = await prisma.vehicleInspection.create({
      data: {
        captainId: data.captainId,
        vehiclePlate: data.vehiclePlate.trim(),
        fuelGauge: data.fuelGauge,
        tempGauge: data.tempGauge,
        oilPressure: data.oilPressure,
        checkEngine: data.checkEngine,
        absLight: data.absLight,
        warningLights: data.warningLights,
        tires: data.tires,
        headlights: data.headlights,
        signals: data.signals,
        mirrors: data.mirrors,
        noLeaks: data.noLeaks,
        fireExtinguisher: data.fireExtinguisher,
        warningTriangle: data.warningTriangle,
        firstAidKit: data.firstAidKit,
        glassHammer: data.glassHammer,
        seatBelts: data.seatBelts,
        driverDeclared: data.driverDeclared,
        notes: data.notes?.trim() || null,
      },
    });

    return {
      success: true,
      inspection: {
        id: created.id,
        captainId: created.captainId,
        captainName: captain.name,
        vehiclePlate: created.vehiclePlate,
        inspectionDate: created.inspectionDate.toISOString().split("T")[0],
        fuelGauge: created.fuelGauge,
        tempGauge: created.tempGauge,
        oilPressure: created.oilPressure,
        checkEngine: created.checkEngine,
        absLight: created.absLight,
        warningLights: created.warningLights,
        tires: created.tires,
        headlights: created.headlights,
        signals: created.signals,
        mirrors: created.mirrors,
        noLeaks: created.noLeaks,
        fireExtinguisher: created.fireExtinguisher,
        warningTriangle: created.warningTriangle,
        firstAidKit: created.firstAidKit,
        glassHammer: created.glassHammer,
        seatBelts: created.seatBelts,
        driverDeclared: created.driverDeclared,
        notes: created.notes,
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Submit inspection error:", error);
    return { success: false, error: "فشل حفظ فحص المركبة اليومي" };
  }
}
