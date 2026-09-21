"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { VehicleInspection } from "@/lib/types";
import { generateAndSaveInspectionPdf, INSPECTIONS_STORAGE_DIR } from "@/lib/inspectionStorage";

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
  inspectionDate?: Date | string;
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
        ...(data.inspectionDate
          ? {
              inspectionDate: new Date(
                typeof data.inspectionDate === "string" && !data.inspectionDate.includes("T")
                  ? `${data.inspectionDate.replace(/\//g, "-")}T10:00:00`
                  : data.inspectionDate
              ),
            }
          : {}),
      },
    });

    // Ensure captain's assignedVehiclePlate is stored if not assigned yet
    if (data.vehiclePlate && (!captain.assignedVehiclePlate || captain.assignedVehiclePlate.trim() === "")) {
      try {
        await prisma.user.update({
          where: { id: data.captainId },
          data: { assignedVehiclePlate: data.vehiclePlate.trim() },
        });
      } catch (syncErr) {
        console.warn("Could not sync captain vehicle plate:", syncErr);
      }
    }

    // Automatically generate and save inspection PDF to storage
    try {
      await generateAndSaveInspectionPdf(created.id);
    } catch (pdfErr) {
      console.warn("Could not generate inspection PDF immediately upon creation:", pdfErr);
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACTIONS & DIRECT PASS
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptainInspectionItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  nationalId?: string | null;
  assignedVehiclePlate?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  hasTodayInspection: boolean;
  todayInspection: VehicleInspection | null;
  lastInspectionDate?: string | null;
  totalInspections: number;
}

export interface InspectionWithMeta extends VehicleInspection {
  captainPhone?: string | null;
  captainAvatar?: string | null;
  contractCount: number;
}

/**
 * Helper to map Prisma record to typed VehicleInspection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPrismaToInspection(r: any): VehicleInspection {
  return {
    id: r.id,
    captainId: r.captainId,
    captainName: r.captain?.name,
    vehiclePlate: r.vehiclePlate,
    inspectionDate: r.inspectionDate instanceof Date ? r.inspectionDate.toISOString().split("T")[0] : String(r.inspectionDate),
    fuelGauge: Boolean(r.fuelGauge),
    tempGauge: Boolean(r.tempGauge),
    oilPressure: Boolean(r.oilPressure),
    checkEngine: Boolean(r.checkEngine),
    absLight: Boolean(r.absLight),
    warningLights: Boolean(r.warningLights),
    tires: Boolean(r.tires),
    headlights: Boolean(r.headlights),
    signals: Boolean(r.signals),
    mirrors: Boolean(r.mirrors),
    noLeaks: Boolean(r.noLeaks),
    fireExtinguisher: Boolean(r.fireExtinguisher),
    warningTriangle: Boolean(r.warningTriangle),
    firstAidKit: Boolean(r.firstAidKit),
    glassHammer: Boolean(r.glassHammer),
    seatBelts: Boolean(r.seatBelts),
    driverDeclared: Boolean(r.driverDeclared),
    notes: r.notes || null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}

/**
 * Get all captains with their inspection status for today
 */
export async function getCaptainsInspectionOverview(): Promise<{
  success: boolean;
  captains?: CaptainInspectionItem[];
  stats?: {
    totalCaptains: number;
    inspectedToday: number;
    pendingToday: number;
    totalInspections: number;
  };
  error?: string;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [captainsList, totalInspectionsCount] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CAPTAIN" },
        include: {
          inspections: {
            orderBy: { createdAt: "desc" },
            take: 2,
            include: {
              captain: { select: { name: true } },
            },
          },
          _count: {
            select: { inspections: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.vehicleInspection.count(),
    ]);

    let inspectedTodayCount = 0;

    const mappedCaptains: CaptainInspectionItem[] = captainsList.map((u) => {
      // Find if any inspection is from today
      const todayInspRecord = u.inspections.find(
        (insp) => new Date(insp.createdAt) >= today
      );

      const hasToday = Boolean(todayInspRecord);
      if (hasToday) inspectedTodayCount++;

      const latestRecord = u.inspections[0] || null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        nationalId: u.nationalId,
        assignedVehiclePlate: u.assignedVehiclePlate,
        avatarUrl: u.avatarUrl,
        active: u.active,
        hasTodayInspection: hasToday,
        todayInspection: todayInspRecord ? mapPrismaToInspection(todayInspRecord) : null,
        lastInspectionDate: latestRecord ? latestRecord.createdAt.toISOString() : null,
        totalInspections: u._count.inspections,
      };
    });

    // Sort: Uninspected captains first, then inspected
    mappedCaptains.sort((a, b) => {
      if (a.hasTodayInspection === b.hasTodayInspection) return 0;
      return a.hasTodayInspection ? 1 : -1;
    });

    return {
      success: true,
      captains: mappedCaptains,
      stats: {
        totalCaptains: mappedCaptains.length,
        inspectedToday: inspectedTodayCount,
        pendingToday: mappedCaptains.length - inspectedTodayCount,
        totalInspections: totalInspectionsCount,
      },
    };
  } catch (error) {
    console.error("getCaptainsInspectionOverview error:", error);
    return { success: false, error: "تعذر تحميل بيانات فحص الكباتن" };
  }
}

/**
 * Direct 1-Click Inspection Completion for a Captain ("إنهاء الفحص المباشر")
 * Sets all 16 safety and operational points to true and approves instantly.
 */
export async function directPassInspection(
  captainId: string,
  vehiclePlate?: string,
  customNotes?: string,
  inspectionDate?: string
): Promise<{
  success: boolean;
  inspection?: VehicleInspection;
  message?: string;
  error?: string;
}> {
  try {
    const captain = await prisma.user.findUnique({
      where: { id: captainId },
    });

    if (!captain) {
      return { success: false, error: "الكابتن غير موجود في النظام" };
    }

    const effectivePlate = (
      vehiclePlate ||
      captain.assignedVehiclePlate ||
      "ا ص ل 7223"
    ).trim();

    let targetDate = new Date();
    if (inspectionDate) {
      const dStr =
        typeof inspectionDate === "string" && !inspectionDate.includes("T")
          ? `${inspectionDate.replace(/\//g, "-")}T10:00:00`
          : inspectionDate;
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) targetDate = d;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allPassedData = {
      fuelGauge: true,
      tempGauge: true,
      oilPressure: true,
      checkEngine: true,
      absLight: true,
      warningLights: true,
      tires: true,
      headlights: true,
      signals: true,
      mirrors: true,
      noLeaks: true,
      fireExtinguisher: true,
      warningTriangle: true,
      firstAidKit: true,
      glassHammer: true,
      seatBelts: true,
      driverDeclared: true,
      notes:
        customNotes?.trim() ||
        "تم الفحص والاعتماد المباشر من قبل إدارة العمليات (اجتياز كامل الفحص التشغيلي)",
      vehiclePlate: effectivePlate,
    };

    // Check if captain already has an inspection today
    const existingToday = await prisma.vehicleInspection.findFirst({
      where: {
        captainId,
        createdAt: { gte: today },
      },
      orderBy: { createdAt: "desc" },
    });

    let savedRecord;

    if (existingToday) {
      savedRecord = await prisma.vehicleInspection.update({
        where: { id: existingToday.id },
        data: {
          ...allPassedData,
          inspectionDate: targetDate,
        },
        include: {
          captain: { select: { name: true } },
        },
      });
    } else {
      savedRecord = await prisma.vehicleInspection.create({
        data: {
          captainId,
          ...allPassedData,
          inspectionDate: targetDate,
        },
        include: {
          captain: { select: { name: true } },
        },
      });
    }

    // Ensure captain's assignedVehiclePlate is stored if not assigned yet
    if (effectivePlate && (!captain.assignedVehiclePlate || captain.assignedVehiclePlate.trim() === "")) {
      try {
        await prisma.user.update({
          where: { id: captainId },
          data: { assignedVehiclePlate: effectivePlate },
        });
      } catch (syncErr) {
        console.warn("Could not sync captain vehicle plate on direct pass:", syncErr);
      }
    }

    // Automatically generate and save inspection PDF to storage
    try {
      await generateAndSaveInspectionPdf(savedRecord.id);
    } catch (pdfErr) {
      console.warn("Could not generate inspection PDF immediately upon direct pass:", pdfErr);
    }

    return {
      success: true,
      inspection: mapPrismaToInspection(savedRecord),
      message: `تم إتمام وتوثيق الفحص المباشر للكابتن ${captain.name} بنجاح`,
    };
  } catch (error) {
    console.error("directPassInspection error:", error);
    return { success: false, error: "حدث خطأ أثناء إجراء الفحص المباشر" };
  }
}

/**
 * Get full history of inspections with filter options
 */
export async function getAllInspectionsList(params?: {
  search?: string;
  captainId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  inspections?: InspectionWithMeta[];
  error?: string;
}> {
  try {
    const limit = params?.limit || 100;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (params?.captainId) {
      where.captainId = params.captainId;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { vehiclePlate: { contains: q } },
        { captain: { name: { contains: q } } },
        { notes: { contains: q } },
      ];
    }

    const records = await prisma.vehicleInspection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        captain: {
          select: {
            name: true,
            phone: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { contracts: true },
        },
      },
    });

    const inspections: InspectionWithMeta[] = records.map((r) => ({
      ...mapPrismaToInspection(r),
      captainPhone: r.captain?.phone,
      captainAvatar: r.captain?.avatarUrl,
      contractCount: r._count.contracts,
    }));

    return {
      success: true,
      inspections,
    };
  } catch (error) {
    console.error("getAllInspectionsList error:", error);
    return { success: false, error: "تعذر جلب سجل الفحوصات التشغيلية" };
  }
}

/**
 * Delete inspection record
 */
export async function deleteInspection(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Unlink any contracts referencing this inspection first
    await prisma.contract.updateMany({
      where: { inspectionId: id },
      data: { inspectionId: null },
    });

    await prisma.vehicleInspection.delete({
      where: { id },
    });

    // Remove PDF from disk storage if exists
    try {
      const shortCode = id.replace(/-/g, "").slice(0, 8).toUpperCase();
      const filePath = path.join(INSPECTIONS_STORAGE_DIR, `inspection-${shortCode}.pdf`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.warn("Could not delete inspection PDF file:", fsErr);
    }

    return { success: true };
  } catch (error) {
    console.error("deleteInspection error:", error);
    return { success: false, error: "تعذر حذف سجل الفحص التشغيلي" };
  }
}

/**
 * Get inspection details by ID
 */
export async function getInspectionById(id: string): Promise<{
  success: boolean;
  inspection?: VehicleInspection & { contracts?: { id: string; referenceNumber: string }[] };
  error?: string;
}> {
  try {
    const record = await prisma.vehicleInspection.findUnique({
      where: { id },
      include: {
        captain: { select: { name: true } },
        contracts: { select: { id: true, referenceNumber: true } },
      },
    });

    if (!record) {
      return { success: false, error: "سجل الفحص غير موجود" };
    }

    return {
      success: true,
      inspection: {
        ...mapPrismaToInspection(record),
        contracts: record.contracts,
      },
    };
  } catch (error) {
    console.error("getInspectionById error:", error);
    return { success: false, error: "تعذر جلب تفاصيل الفحص" };
  }
}

/**
 * Update an existing inspection record
 */
export async function updateInspection(
  id: string,
  data: Partial<InspectionInput>
): Promise<{ success: boolean; inspection?: VehicleInspection; error?: string }> {
  try {
    const existing = await prisma.vehicleInspection.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "سجل الفحص غير موجود" };
    }

    let parsedDate: Date | undefined;
    if (data.inspectionDate) {
      const dStr = typeof data.inspectionDate === "string" && !data.inspectionDate.includes("T")
        ? `${data.inspectionDate.replace(/\//g, "-")}T10:00:00`
        : data.inspectionDate;
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const updated = await prisma.vehicleInspection.update({
      where: { id },
      data: {
        ...(data.vehiclePlate !== undefined && { vehiclePlate: data.vehiclePlate }),
        ...(parsedDate && { inspectionDate: parsedDate }),
        ...(data.fuelGauge !== undefined && { fuelGauge: data.fuelGauge }),
        ...(data.tempGauge !== undefined && { tempGauge: data.tempGauge }),
        ...(data.oilPressure !== undefined && { oilPressure: data.oilPressure }),
        ...(data.checkEngine !== undefined && { checkEngine: data.checkEngine }),
        ...(data.absLight !== undefined && { absLight: data.absLight }),
        ...(data.warningLights !== undefined && { warningLights: data.warningLights }),
        ...(data.tires !== undefined && { tires: data.tires }),
        ...(data.headlights !== undefined && { headlights: data.headlights }),
        ...(data.signals !== undefined && { signals: data.signals }),
        ...(data.mirrors !== undefined && { mirrors: data.mirrors }),
        ...(data.noLeaks !== undefined && { noLeaks: data.noLeaks }),
        ...(data.fireExtinguisher !== undefined && { fireExtinguisher: data.fireExtinguisher }),
        ...(data.warningTriangle !== undefined && { warningTriangle: data.warningTriangle }),
        ...(data.firstAidKit !== undefined && { firstAidKit: data.firstAidKit }),
        ...(data.glassHammer !== undefined && { glassHammer: data.glassHammer }),
        ...(data.seatBelts !== undefined && { seatBelts: data.seatBelts }),
        ...(data.driverDeclared !== undefined && { driverDeclared: data.driverDeclared }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        captain: { select: { name: true } },
      },
    });

    // Automatically regenerate and save inspection PDF to storage
    try {
      await generateAndSaveInspectionPdf(updated.id);
    } catch (pdfErr) {
      console.warn("Could not regenerate inspection PDF upon update:", pdfErr);
    }

    return {
      success: true,
      inspection: mapPrismaToInspection(updated),
    };
  } catch (error) {
    console.error("updateInspection error:", error);
    return { success: false, error: "تعذر تحديث بيانات الفحص" };
  }
}
