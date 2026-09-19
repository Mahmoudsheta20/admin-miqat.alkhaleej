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

export async function submitContract(
  formData: ContractFormPayload
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  try {
    if (!formData.customerName?.trim()) {
      return { success: false, error: "اسم العميل / الضيف الأساسي مطلوب" };
    }
    if (!formData.origin?.trim() || !formData.destination?.trim()) {
      return { success: false, error: "مسار الرحلة (الانطلاق والوجهة) مطلوب" };
    }
    if (!formData.captainId) {
      return { success: false, error: "معرف الكابتن مطلوب" };
    }

    // Auto-generate unique reference number: MQ-YYYY-XXXXX
    const year = new Date().getFullYear();
    const count = await prisma.contract.count();
    const sequenceNum = String(count + 1).padStart(5, "0");
    const referenceNumber = `MQ-${year}-${sequenceNum}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the contract
      const contract = await tx.contract.create({
        data: {
          referenceNumber,
          operationType: formData.operationType,
          origin: formData.origin.trim(),
          destination: formData.destination.trim(),
          tripDate: formData.tripDate,
          tripTime: formData.tripTime,
          flightCarrier: formData.flightCarrier?.trim() || null,
          flightNumber: formData.flightNumber?.trim() || null,
          customerName: formData.customerName.trim(),
          customerPhone: formData.customerPhone?.trim() || null,
          notes: formData.notes?.trim() || null,
          inspectionId: formData.inspectionId || null,
          captainId: formData.captainId,
          vehiclePlate: formData.vehiclePlate.trim(),
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
            nationality: p.nationality?.trim() || "سعودي",
            idNumber: p.idNumber?.trim() || "",
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
    return { success: false, error: "فشل إنشاء وتوثيق العقد" };
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
