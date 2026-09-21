import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean old records
  await prisma.passenger.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.vehicleInspection.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      id: "usr_admin",
      name: "م. فهد القرشي",
      email: "miqatalkhaleej@gmail.com",
      role: "ADMIN",
      phone: "+966552293398",
      active: true,
    },
  });

  const adminUser2 = await prisma.user.create({
    data: {
      id: "usr_admin_mahmoud",
      name: "محمود شتة (مدير النظام)",
      email: "shetamahmoud463@gmail.com",
      role: "ADMIN",
      phone: "+966500000001",
      active: true,
    },
  });

  const captain1 = await prisma.user.create({
    data: {
      id: "usr_captain_1",
      name: "علي أحمد غلام أحمد",
      email: "captain@miqat.com",
      role: "CAPTAIN",
      phone: "0542273515",
      nationalId: "2553660073",
      licenseNumber: "SA-39482910",
      licenseExpiry: "2028/04/22",
      assignedVehiclePlate: "ا ص ل 7223",
      active: true,
    },
  });

  const captain2 = await prisma.user.create({
    data: {
      id: "usr_captain_2",
      name: "محمد عبد الله العتيبي",
      email: "captain2@miqat.com",
      role: "CAPTAIN",
      phone: "0554129988",
      nationalId: "1098274615",
      licenseNumber: "SA-90812455",
      licenseExpiry: "2027/12/01",
      assignedVehiclePlate: "ب ر ق 9012",
      active: true,
    },
  });

  // 2. Create Vehicles
  const veh1 = await prisma.vehicle.create({
    data: {
      id: "veh_1",
      plateNumberAr: "ا ص ل 7223",
      plateNumberEn: "ASL 7223",
      make: "GMC",
      model: "Yukon XL VIP",
      year: 2025,
      category: "GMC_YUKON",
      capacity: 7,
      status: "ON_TRIP",
      registrationExpiry: "2027/05/14",
      insuranceExpiry: "2027/01/20",
      currentMileage: 42150,
    },
  });

  const veh2 = await prisma.vehicle.create({
    data: {
      id: "veh_2",
      plateNumberAr: "ب ر ق 9012",
      plateNumberEn: "BRQ 9012",
      make: "Mercedes-Benz",
      model: "V-Class VIP Luxury",
      year: 2025,
      category: "VIP_VAN",
      capacity: 6,
      status: "AVAILABLE",
      registrationExpiry: "2027/08/10",
      insuranceExpiry: "2026/12/30",
      currentMileage: 18400,
    },
  });

  const veh3 = await prisma.vehicle.create({
    data: {
      id: "veh_3",
      plateNumberAr: "د ن م 4410",
      plateNumberEn: "DNM 4410",
      make: "Toyota",
      model: "HiAce Super Custom",
      year: 2024,
      category: "VIP_VAN",
      capacity: 10,
      status: "AVAILABLE",
      registrationExpiry: "2026/11/05",
      insuranceExpiry: "2026/10/15",
      currentMileage: 64200,
    },
  });

  // 3. Create Daily Vehicle Inspection
  const inspection1 = await prisma.vehicleInspection.create({
    data: {
      id: "insp_1",
      captainId: captain1.id,
      vehiclePlate: "ا ص ل 7223",
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
      notes: "الفحص الصباحي مكتمل - الحالة ممتازة",
    },
  });

  // 4. Create Contract with Passengers
  const contract1 = await prisma.contract.create({
    data: {
      id: "contract_1",
      referenceNumber: "MQ-2026-00841",
      operationType: "AIRPORT_TRANSFER",
      origin: "مكة المكرمة (فندق العنوان جبل عمر)",
      destination: "مطار الملك عبد العزيز الدولي بجدة (صالة 1)",
      tripDate: "2026/09/08",
      tripTime: "14:30",
      flightCarrier: "الخطوط السعودية",
      flightNumber: "SV841",
      customerName: "ماجد بن فيصل الحربي",
      customerPhone: "0559871234",
      notes: "استقبال VIP مع الأمتعة - يرجى توفير مياه زمزم مبردة",
      inspectionId: inspection1.id,
      captainId: captain1.id,
      vehiclePlate: "ا ص ل 7223",
      passengers: {
        create: [
          { sequence: 1, name: "ماجد الحربي", nationality: "سعودي", idNumber: "1087654321" },
          { sequence: 2, name: "سعود الحربي", nationality: "سعودي", idNumber: "1087654322" },
          { sequence: 3, name: "فيصل الحربي", nationality: "سعودي", idNumber: "1087654323" },
          { sequence: 4, name: "سلطان الحربي", nationality: "سعودي", idNumber: "1087654324" },
          { sequence: 5, name: "نايف الحربي", nationality: "سعودي", idNumber: "1087654325" },
          { sequence: 6, name: "حور الحربي", nationality: "سعودي", idNumber: "" },
          { sequence: 7, name: "سجى الحربي", nationality: "سعودي", idNumber: "" },
          { sequence: 8, name: "ساره الحربي", nationality: "سعودي", idNumber: "" },
          { sequence: 9, name: "وداد الحربي", nationality: "سعودي", idNumber: "" },
          { sequence: 10, name: "نجود الحربي", nationality: "سعودي", idNumber: "" },
        ],
      },
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
