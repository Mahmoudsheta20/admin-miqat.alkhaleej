"use server";

import { prisma } from "@/lib/prisma";
import { Contract, OperationType } from "@/lib/types";
import {
  generateAndSaveContractPdf,
  syncAllExistingContractsToStorage,
} from "@/lib/contractStorage";

export interface PassengerInput {
  name: string;
  nationality: string;
  idNumber: string;
}

export interface ContractFormPayload {
  operationType: OperationType;
  origin: string;
  destination: string;
  tripDate: string;
  tripTime: string;
  flightCarrier?: string;
  flightNumber?: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  captainId: string;
  vehiclePlate: string;
  inspectionId?: string;
  passengers: PassengerInput[];
}

function cleanStr(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "$undefined" || trimmed === "undefined" || trimmed === "null") return null;
  return trimmed;
}

export async function submitContract(
  formData: ContractFormPayload
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  try {
    const customerName = cleanStr(formData.customerName);
    if (!customerName) {
      return { success: false, error: "اسم العميل / الضيف الأساسي مطلوب" };
    }
    const origin = cleanStr(formData.origin);
    const destination = cleanStr(formData.destination);
    if (!origin || !destination) {
      return { success: false, error: "مسار الرحلة (الانطلاق والوجهة) مطلوب" };
    }

    // Resolve captainId safely
    let captainId = cleanStr(formData.captainId);
    if (captainId) {
      const exists = await prisma.user.findUnique({
        where: { id: captainId },
        select: { id: true },
      });
      if (!exists) {
        captainId = null;
      }
    }
    if (!captainId) {
      const fallback = await prisma.user.findFirst({
        where: { role: "CAPTAIN", active: true },
        select: { id: true },
      });
      if (fallback) {
        captainId = fallback.id;
      } else {
        return { success: false, error: "لم يتم العثور على كابتن مسجل في النظام" };
      }
    }

    // Resolve inspectionId safely (prevent foreign key violation)
    let validInspectionId: string | null = null;
    const cleanInspId = cleanStr(formData.inspectionId);
    if (cleanInspId) {
      const existsInsp = await prisma.vehicleInspection.findUnique({
        where: { id: cleanInspId },
        select: { id: true },
      });
      if (existsInsp) {
        validInspectionId = existsInsp.id;
      }
    }

    // Auto-generate guaranteed unique reference number: MQ-YYYY-XXXXX
    const year = new Date().getFullYear();
    let sequence = (await prisma.contract.count()) + 1;
    let referenceNumber = `MQ-${year}-${String(sequence).padStart(5, "0")}`;
    while (await prisma.contract.findUnique({ where: { referenceNumber }, select: { id: true } })) {
      sequence++;
      referenceNumber = `MQ-${year}-${String(sequence).padStart(5, "0")}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the contract
      const contract = await tx.contract.create({
        data: {
          referenceNumber,
          operationType: formData.operationType,
          origin,
          destination,
          tripDate: cleanStr(formData.tripDate) || new Date().toISOString().split("T")[0],
          tripTime: cleanStr(formData.tripTime) || "12:00",
          flightCarrier: cleanStr(formData.flightCarrier),
          flightNumber: cleanStr(formData.flightNumber),
          customerName,
          customerPhone: cleanStr(formData.customerPhone),
          notes: cleanStr(formData.notes),
          inspectionId: validInspectionId,
          captainId: captainId!,
          vehiclePlate: cleanStr(formData.vehiclePlate) || "ا ص ل 7223",
        },
      });

      // 2. Create passengers if provided
      const validPassengers = (formData.passengers || []).filter(
        (p) => p.name && p.name.trim().length > 0
      );

      if (validPassengers.length > 0) {
        await tx.passenger.createMany({
          data: validPassengers.map((p, index) => ({
            sequence: index + 1,
            name: p.name.trim(),
            nationality: cleanStr(p.nationality) || "سعودي",
            idNumber: cleanStr(p.idNumber) || "",
            contractId: contract.id,
          })),
        });
      }

      return tx.contract.findUnique({
        where: { id: contract.id },
        include: {
          passengers: { orderBy: { sequence: "asc" } },
          captain: true,
          inspection: true,
        },
      });
    });

    if (!result) {
      return { success: false, error: "فشل حفظ العقد" };
    }

    // Auto-generate unique QR code & official PDF to persistent storage
    let storedPdfPath = result.pdfPath;
    try {
      const savedPdf = await generateAndSaveContractPdf(result.id);
      storedPdfPath = savedPdf.publicUrl;
    } catch (pdfErr) {
      console.warn("Could not generate PDF immediately upon contract creation:", pdfErr);
    }

    return {
      success: true,
      contract: {
        id: result.id,
        referenceNumber: result.referenceNumber,
        operationType: result.operationType as OperationType,
        origin: result.origin,
        destination: result.destination,
        tripDate: result.tripDate,
        tripTime: result.tripTime,
        flightCarrier: result.flightCarrier,
        flightNumber: result.flightNumber,
        customerName: result.customerName,
        customerPhone: result.customerPhone,
        notes: result.notes,
        inspectionId: result.inspectionId,
        captainId: result.captainId,
        vehiclePlate: result.vehiclePlate,
        pdfPath: storedPdfPath,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        passengers: result.passengers.map((p) => ({
          id: p.id,
          sequence: p.sequence,
          name: p.name,
          nationality: p.nationality,
          idNumber: p.idNumber,
          contractId: p.contractId,
        })),
        captain: result.captain
          ? {
              id: result.captain.id,
              name: result.captain.name,
              email: result.captain.email,
              role: result.captain.role as "CAPTAIN",
              phone: result.captain.phone,
              nationalId: result.captain.nationalId,
              licenseNumber: result.captain.licenseNumber,
              licenseExpiry: result.captain.licenseExpiry,
              assignedVehiclePlate: result.captain.assignedVehiclePlate,
              active: result.captain.active,
            }
          : undefined,
      },
    };
  } catch (error) {
    console.error("Submit contract error:", error);
    const errMessage = error instanceof Error ? error.message : "فشل إنشاء وتوثيق العقد";
    return { success: false, error: errMessage };
  }
}

export async function getContracts(filters?: {
  captainId?: string;
  operationType?: OperationType;
  search?: string;
}): Promise<{ success: boolean; contracts?: Contract[]; error?: string }> {
  try {
    const where: Record<string, unknown> = {};

    if (filters?.captainId) {
      where.captainId = filters.captainId;
    }

    if (filters?.operationType) {
      where.operationType = filters.operationType;
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { referenceNumber: { contains: q } },
        { customerName: { contains: q } },
        { vehiclePlate: { contains: q } },
        { flightNumber: { contains: q } },
      ];
    }

    const records = await prisma.contract.findMany({
      where,
      include: {
        passengers: { orderBy: { sequence: "asc" } },
        captain: true,
        inspection: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const contracts: Contract[] = records.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      operationType: c.operationType as OperationType,
      origin: c.origin,
      destination: c.destination,
      tripDate: c.tripDate,
      tripTime: c.tripTime,
      flightCarrier: c.flightCarrier,
      flightNumber: c.flightNumber,
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      notes: c.notes,
      inspectionId: c.inspectionId,
      captainId: c.captainId,
      vehiclePlate: c.vehiclePlate,
      pdfPath: c.pdfPath,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      passengers: c.passengers.map((p) => ({
        id: p.id,
        sequence: p.sequence,
        name: p.name,
        nationality: p.nationality,
        idNumber: p.idNumber,
        contractId: p.contractId,
      })),
      captain: c.captain
        ? {
            id: c.captain.id,
            name: c.captain.name,
            email: c.captain.email,
            role: c.captain.role as "CAPTAIN",
            phone: c.captain.phone,
            nationalId: c.captain.nationalId,
            assignedVehiclePlate: c.captain.assignedVehiclePlate,
            active: c.captain.active,
          }
        : undefined,
    }));

    return { success: true, contracts };
  } catch (error) {
    console.error("Get contracts error:", error);
    return { success: false, error: "تعذر جلب العقود" };
  }
}

export async function getContractById(
  id: string
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  try {
    const c = await prisma.contract.findFirst({
      where: {
        OR: [{ id }, { referenceNumber: id }],
      },
      include: {
        passengers: { orderBy: { sequence: "asc" } },
        captain: true,
        inspection: true,
      },
    });

    if (!c) {
      return { success: false, error: "العقد غير موجود" };
    }

    return {
      success: true,
      contract: {
        id: c.id,
        referenceNumber: c.referenceNumber,
        operationType: c.operationType as OperationType,
        origin: c.origin,
        destination: c.destination,
        tripDate: c.tripDate,
        tripTime: c.tripTime,
        flightCarrier: c.flightCarrier,
        flightNumber: c.flightNumber,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        notes: c.notes,
        inspectionId: c.inspectionId,
        captainId: c.captainId,
        vehiclePlate: c.vehiclePlate,
        pdfPath: c.pdfPath,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        passengers: c.passengers.map((p) => ({
          id: p.id,
          sequence: p.sequence,
          name: p.name,
          nationality: p.nationality,
          idNumber: p.idNumber,
          contractId: p.contractId,
        })),
        captain: c.captain
          ? {
              id: c.captain.id,
              name: c.captain.name,
              email: c.captain.email,
              role: c.captain.role as "CAPTAIN",
              phone: c.captain.phone,
              nationalId: c.captain.nationalId,
              licenseNumber: c.captain.licenseNumber,
              licenseExpiry: c.captain.licenseExpiry,
              assignedVehiclePlate: c.captain.assignedVehiclePlate,
              active: c.captain.active,
            }
          : undefined,
        inspection: c.inspection
          ? {
              id: c.inspection.id,
              captainId: c.inspection.captainId,
              vehiclePlate: c.inspection.vehiclePlate,
              inspectionDate: c.inspection.inspectionDate.toISOString().split("T")[0],
              fuelGauge: c.inspection.fuelGauge,
              tempGauge: c.inspection.tempGauge,
              oilPressure: c.inspection.oilPressure,
              checkEngine: c.inspection.checkEngine,
              absLight: c.inspection.absLight,
              warningLights: c.inspection.warningLights,
              tires: c.inspection.tires,
              headlights: c.inspection.headlights,
              signals: c.inspection.signals,
              mirrors: c.inspection.mirrors,
              noLeaks: c.inspection.noLeaks,
              fireExtinguisher: c.inspection.fireExtinguisher,
              warningTriangle: c.inspection.warningTriangle,
              firstAidKit: c.inspection.firstAidKit,
              glassHammer: c.inspection.glassHammer,
              seatBelts: c.inspection.seatBelts,
              driverDeclared: c.inspection.driverDeclared,
              notes: c.inspection.notes,
              createdAt: c.inspection.createdAt.toISOString(),
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Get contract by id error:", error);
    return { success: false, error: "تعذر جلب تفاصيل العقد" };
  }
}

export async function syncAllContractsToStorageAction(): Promise<{
  success: boolean;
  total?: number;
  saved?: number;
  errors?: string[];
  error?: string;
}> {
  try {
    const res = await syncAllExistingContractsToStorage();
    return { success: true, ...res };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
