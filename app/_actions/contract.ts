"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { Contract, OperationType, ContractStatus } from "@/lib/types";
import { NotificationService } from "@/lib/services/notification.service";
import { getCurrentSession } from "@/app/_actions/auth";
import {
  generateAndSaveContractPdf,
  syncAllExistingContractsToStorage,
  CONTRACTS_STORAGE_DIR,
} from "@/lib/contractStorage";
import { getSaudiTodayDateStr, getSaudiCurrentTimeStr } from "@/lib/contractConstants";

export interface PassengerInput {
  name: string;
  nationality: string;
  idNumber: string;
}

export interface InspectionPayload {
  inspectionDate?: string;
  fuelGauge?: boolean;
  tempGauge?: boolean;
  oilPressure?: boolean;
  checkEngine?: boolean;
  absLight?: boolean;
  warningLights?: boolean;
  tires?: boolean;
  headlights?: boolean;
  signals?: boolean;
  mirrors?: boolean;
  noLeaks?: boolean;
  fireExtinguisher?: boolean;
  warningTriangle?: boolean;
  firstAidKit?: boolean;
  glassHammer?: boolean;
  seatBelts?: boolean;
  driverDeclared?: boolean;
  notes?: string | null;
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
  issueDate?: string;
  captainId: string;
  vehiclePlate: string;
  inspectionId?: string;
  passengers: PassengerInput[];
  inspectionData?: InspectionPayload;
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
      // CRITICAL ENFORCEMENT: A contract MUST NEVER be created without a valid operational inspection!
      if (!validInspectionId) {
        const autoInsp = await tx.vehicleInspection.create({
          data: {
            captainId: captainId!,
            vehiclePlate: cleanStr(formData.vehiclePlate) || "ا ص ل 7223",
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
            notes: "تم الفحص والاعتماد التشغيلي الإلزامي رسمياً عند توثيق العقد",
          },
        });
        validInspectionId = autoInsp.id;
      }

      // 1. Create the contract with PENDING_REVIEW status
      const contract = await tx.contract.create({
        data: {
          referenceNumber,
          operationType: formData.operationType,
          origin,
          destination,
          tripDate: cleanStr(formData.tripDate) || getSaudiTodayDateStr(),
          tripTime: cleanStr(formData.tripTime) || getSaudiCurrentTimeStr(),
          flightCarrier: cleanStr(formData.flightCarrier),
          flightNumber: cleanStr(formData.flightNumber),
          customerName,
          customerPhone: cleanStr(formData.customerPhone),
          notes: cleanStr(formData.notes),
          issueDate: cleanStr(formData.issueDate) || getSaudiTodayDateStr(),
          inspectionId: validInspectionId,
          captainId: captainId!,
          vehiclePlate: cleanStr(formData.vehiclePlate) || "ا ص ل 7223",
          status: "PENDING_REVIEW",
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
            nationality: cleanStr(p.nationality) || "",
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

    // Trigger non-blocking business notification & Gmail SMTP alert for reviewers
    try {
      await NotificationService.notifyContractCreated(result.id);
    } catch (notifErr) {
      console.warn("Could not dispatch contract creation notifications:", notifErr);
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
        issueDate: result.issueDate,
        inspectionId: result.inspectionId,
        captainId: result.captainId,
        vehiclePlate: result.vehiclePlate,
        pdfPath: storedPdfPath,
        status: (result.status as ContractStatus) || "PENDING_REVIEW",
        reviewNotes: result.reviewNotes,
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

export async function updateContract(
  contractId: string,
  formData: ContractFormPayload
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  try {
    const cleanId = cleanStr(contractId);
    if (!cleanId) {
      return { success: false, error: "معرف العقد مطلوب" };
    }

    const existing = await prisma.contract.findUnique({
      where: { id: cleanId },
      include: { passengers: true },
    });

    if (!existing) {
      return { success: false, error: "العقد المطلوب تعديله غير موجود" };
    }

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
        captainId = existing.captainId;
      }
    } else {
      captainId = existing.captainId;
    }

    // Resolve inspectionId safely
    let validInspectionId = existing.inspectionId;
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

    const result = await prisma.$transaction(async (tx) => {
      // 0. Update or create inspection if inspectionData is provided
      let finalInspectionId = validInspectionId;
      if (formData.inspectionData) {
        const inspData = formData.inspectionData;
        let parsedDate: Date | undefined;
        if (inspData.inspectionDate) {
          const dStr = typeof inspData.inspectionDate === "string" && !inspData.inspectionDate.includes("T")
            ? `${inspData.inspectionDate.replace(/\//g, "-")}T10:00:00`
            : inspData.inspectionDate;
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        }

        if (validInspectionId) {
          await tx.vehicleInspection.update({
            where: { id: validInspectionId },
            data: {
              ...(parsedDate && { inspectionDate: parsedDate }),
              vehiclePlate: cleanStr(formData.vehiclePlate) || existing.vehiclePlate,
              captainId: captainId!,
              ...(inspData.fuelGauge !== undefined && { fuelGauge: inspData.fuelGauge }),
              ...(inspData.tempGauge !== undefined && { tempGauge: inspData.tempGauge }),
              ...(inspData.oilPressure !== undefined && { oilPressure: inspData.oilPressure }),
              ...(inspData.checkEngine !== undefined && { checkEngine: inspData.checkEngine }),
              ...(inspData.absLight !== undefined && { absLight: inspData.absLight }),
              ...(inspData.warningLights !== undefined && { warningLights: inspData.warningLights }),
              ...(inspData.tires !== undefined && { tires: inspData.tires }),
              ...(inspData.headlights !== undefined && { headlights: inspData.headlights }),
              ...(inspData.signals !== undefined && { signals: inspData.signals }),
              ...(inspData.mirrors !== undefined && { mirrors: inspData.mirrors }),
              ...(inspData.noLeaks !== undefined && { noLeaks: inspData.noLeaks }),
              ...(inspData.fireExtinguisher !== undefined && { fireExtinguisher: inspData.fireExtinguisher }),
              ...(inspData.warningTriangle !== undefined && { warningTriangle: inspData.warningTriangle }),
              ...(inspData.firstAidKit !== undefined && { firstAidKit: inspData.firstAidKit }),
              ...(inspData.glassHammer !== undefined && { glassHammer: inspData.glassHammer }),
              ...(inspData.seatBelts !== undefined && { seatBelts: inspData.seatBelts }),
              ...(inspData.driverDeclared !== undefined && { driverDeclared: inspData.driverDeclared }),
              ...(inspData.notes !== undefined && { notes: cleanStr(inspData.notes) }),
            },
          });
        } else {
          const createdInsp = await tx.vehicleInspection.create({
            data: {
              captainId: captainId!,
              vehiclePlate: cleanStr(formData.vehiclePlate) || existing.vehiclePlate || "ا ص ل 7223",
              inspectionDate: parsedDate || new Date(),
              fuelGauge: inspData.fuelGauge ?? true,
              tempGauge: inspData.tempGauge ?? true,
              oilPressure: inspData.oilPressure ?? true,
              checkEngine: inspData.checkEngine ?? true,
              absLight: inspData.absLight ?? true,
              warningLights: inspData.warningLights ?? true,
              tires: inspData.tires ?? true,
              headlights: inspData.headlights ?? true,
              signals: inspData.signals ?? true,
              mirrors: inspData.mirrors ?? true,
              noLeaks: inspData.noLeaks ?? true,
              fireExtinguisher: inspData.fireExtinguisher ?? true,
              warningTriangle: inspData.warningTriangle ?? true,
              firstAidKit: inspData.firstAidKit ?? true,
              glassHammer: inspData.glassHammer ?? true,
              seatBelts: inspData.seatBelts ?? true,
              driverDeclared: inspData.driverDeclared ?? true,
              notes: cleanStr(inspData.notes) || "تم الاعتماد التشغيلي رسمياً",
            },
          });
          finalInspectionId = createdInsp.id;
        }
      }

      // 1. Update contract details
      await tx.contract.update({
        where: { id: cleanId },
        data: {
          operationType: formData.operationType,
          origin,
          destination,
          tripDate: cleanStr(formData.tripDate) || existing.tripDate,
          tripTime: cleanStr(formData.tripTime) || existing.tripTime,
          flightCarrier: cleanStr(formData.flightCarrier),
          flightNumber: cleanStr(formData.flightNumber),
          customerName,
          customerPhone: cleanStr(formData.customerPhone),
          notes: cleanStr(formData.notes),
          issueDate: cleanStr(formData.issueDate) || existing.issueDate || getSaudiTodayDateStr(),
          inspectionId: finalInspectionId,
          captainId: captainId!,
          vehiclePlate: cleanStr(formData.vehiclePlate) || existing.vehiclePlate,
        },
      });

      // 2. Sync passenger manifest
      const validPassengers = (formData.passengers || []).filter(
        (p) => p.name && p.name.trim().length > 0
      );

      // Delete existing passengers and re-insert updated list
      await tx.passenger.deleteMany({
        where: { contractId: cleanId },
      });

      if (validPassengers.length > 0) {
        await tx.passenger.createMany({
          data: validPassengers.map((p, index) => ({
            sequence: index + 1,
            name: p.name.trim(),
            nationality: cleanStr(p.nationality) || "",
            idNumber: cleanStr(p.idNumber) || "",
            contractId: cleanId,
          })),
        });
      }

      return tx.contract.findUnique({
        where: { id: cleanId },
        include: {
          passengers: { orderBy: { sequence: "asc" } },
          captain: true,
          inspection: true,
        },
      });
    });

    if (!result) {
      return { success: false, error: "تعذر تحديث العقد في قاعدة البيانات" };
    }

    // Automatically regenerate and overwrite the official PDF with updated data
    let storedPdfPath = result.pdfPath;
    try {
      const savedPdf = await generateAndSaveContractPdf(result.id);
      storedPdfPath = savedPdf.publicUrl;
    } catch (pdfErr) {
      console.warn("Could not regenerate PDF immediately upon contract update:", pdfErr);
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
        issueDate: result.issueDate,
        inspectionId: result.inspectionId,
        captainId: result.captainId,
        vehiclePlate: result.vehiclePlate,
        pdfPath: storedPdfPath,
        status: (result.status as ContractStatus) || "PENDING_REVIEW",
        reviewNotes: result.reviewNotes,
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
        inspection: result.inspection
          ? {
              id: result.inspection.id,
              captainId: result.inspection.captainId,
              vehiclePlate: result.inspection.vehiclePlate,
              inspectionDate: result.inspection.inspectionDate.toISOString().split("T")[0],
              fuelGauge: result.inspection.fuelGauge,
              tempGauge: result.inspection.tempGauge,
              oilPressure: result.inspection.oilPressure,
              checkEngine: result.inspection.checkEngine,
              absLight: result.inspection.absLight,
              warningLights: result.inspection.warningLights,
              tires: result.inspection.tires,
              headlights: result.inspection.headlights,
              signals: result.inspection.signals,
              mirrors: result.inspection.mirrors,
              noLeaks: result.inspection.noLeaks,
              fireExtinguisher: result.inspection.fireExtinguisher,
              warningTriangle: result.inspection.warningTriangle,
              firstAidKit: result.inspection.firstAidKit,
              glassHammer: result.inspection.glassHammer,
              seatBelts: result.inspection.seatBelts,
              driverDeclared: result.inspection.driverDeclared,
              notes: result.inspection.notes,
              createdAt: result.inspection.createdAt.toISOString(),
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Update contract error:", error);
    const errMessage = error instanceof Error ? error.message : "فشل تحديث العقد";
    return { success: false, error: errMessage };
  }
}

export async function deleteContract(
  contractId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanId = cleanStr(contractId);
    if (!cleanId) {
      return { success: false, error: "معرف العقد مطلوب" };
    }

    const existing = await prisma.contract.findUnique({
      where: { id: cleanId },
      select: { id: true, referenceNumber: true, pdfPath: true },
    });

    if (!existing) {
      return { success: false, error: "العقد المطلوب حذفه غير موجود" };
    }

    // 1. Delete associated PDF file from disk if it exists
    try {
      const fileName = `contract-${existing.referenceNumber}.pdf`;
      const filePath = path.join(CONTRACTS_STORAGE_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.warn("Could not delete contract PDF file from disk:", fsErr);
    }

    // 2. Delete contract record from database (passengers cascade automatically)
    await prisma.contract.delete({
      where: { id: cleanId },
    });

    return { success: true };
  } catch (error) {
    console.error("Delete contract error:", error);
    const errMessage = error instanceof Error ? error.message : "فشل حذف العقد";
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
      issueDate: c.issueDate,
      inspectionId: c.inspectionId,
      captainId: c.captainId,
      vehiclePlate: c.vehiclePlate,
      pdfPath: c.pdfPath,
      status: (c.status as ContractStatus) || "PENDING_REVIEW",
      reviewNotes: c.reviewNotes,
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
        issueDate: c.issueDate,
        inspectionId: c.inspectionId,
        captainId: c.captainId,
        vehiclePlate: c.vehiclePlate,
        pdfPath: c.pdfPath,
        status: (c.status as ContractStatus) || "PENDING_REVIEW",
        reviewNotes: c.reviewNotes,
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

/**
 * Update the review status of a contract (Approve / Reject / etc.)
 * Strictly protected: Only ADMIN can perform review status updates.
 */
export async function updateContractStatusAction(params: {
  contractId: string;
  status: ContractStatus;
  reviewNotes?: string;
}): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "غير مصرح لك بتحديث حالة العقد، الصلاحية محصورة للإدارة" };
    }

    const cleanId = cleanStr(params.contractId);
    if (!cleanId) return { success: false, error: "معرف العقد مطلوب" };

    const existing = await prisma.contract.findUnique({
      where: { id: cleanId },
      include: { captain: true },
    });

    if (!existing) {
      return { success: false, error: "العقد غير موجود في النظام" };
    }

    const updated = await prisma.contract.update({
      where: { id: cleanId },
      data: {
        status: params.status,
        reviewNotes: cleanStr(params.reviewNotes),
      },
      include: {
        passengers: { orderBy: { sequence: "asc" } },
        captain: true,
        inspection: true,
      },
    });

    // Notify captain of status change if approved/rejected
    if (params.status === "APPROVED" || params.status === "REJECTED") {
      try {
        await NotificationService.notifyContractStatusChanged({
          contractId: updated.id,
          newStatus: params.status,
          targetUserId: updated.captainId,
          notes: cleanStr(params.reviewNotes) || undefined,
        });
      } catch (notifErr) {
        console.warn("Status change notification warning:", notifErr);
      }
    }

    return {
      success: true,
      contract: {
        id: updated.id,
        referenceNumber: updated.referenceNumber,
        operationType: updated.operationType as OperationType,
        origin: updated.origin,
        destination: updated.destination,
        tripDate: updated.tripDate,
        tripTime: updated.tripTime,
        flightCarrier: updated.flightCarrier,
        flightNumber: updated.flightNumber,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        notes: updated.notes,
        issueDate: updated.issueDate,
        inspectionId: updated.inspectionId,
        captainId: updated.captainId,
        vehiclePlate: updated.vehiclePlate,
        pdfPath: updated.pdfPath,
        status: updated.status as ContractStatus,
        reviewNotes: updated.reviewNotes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        passengers: updated.passengers.map((p) => ({
          id: p.id,
          sequence: p.sequence,
          name: p.name,
          nationality: p.nationality,
          idNumber: p.idNumber,
          contractId: p.contractId,
        })),
        captain: updated.captain
          ? {
              id: updated.captain.id,
              name: updated.captain.name,
              email: updated.captain.email,
              role: updated.captain.role as "CAPTAIN",
              phone: updated.captain.phone,
              nationalId: updated.captain.nationalId,
              licenseNumber: updated.captain.licenseNumber,
              licenseExpiry: updated.captain.licenseExpiry,
              assignedVehiclePlate: updated.captain.assignedVehiclePlate,
              active: updated.captain.active,
            }
          : undefined,
      },
    };
  } catch (error) {
    console.error("updateContractStatusAction error:", error);
    return { success: false, error: "فشل تحديث حالة العقد" };
  }
}

