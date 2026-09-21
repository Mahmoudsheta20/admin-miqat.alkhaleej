export type UserRole = "ADMIN" | "CAPTAIN";

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  nationalId?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  assignedVehiclePlate?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  mustChangePassword?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type VehicleStatus = "AVAILABLE" | "ON_TRIP" | "MAINTENANCE";

export type OperationType =
  | "AIRPORT_TRANSFER"
  | "CITY_TOUR"
  | "INTERCITY"
  | "HAJJ_UMRAH";

export interface Vehicle {
  id: string;
  plateNumberAr: string;
  plateNumberEn: string;
  make: string;
  model: string;
  year: number;
  category: string;
  capacity: number;
  status: VehicleStatus;
  registrationExpiry: string;
  insuranceExpiry: string;
  currentMileage?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Passenger {
  id?: string;
  sequence?: number;
  name: string;
  nationality: string;
  idNumber: string;
  contractId?: string;
}

export interface VehicleInspection {
  id: string;
  captainId: string;
  captainName?: string;
  vehiclePlate: string;
  inspectionDate: string | Date;
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
  notes?: string | null;
  createdAt?: string | Date;
}

export type ContractStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED";

export interface SystemNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  contractId?: string | null;
  isRead: boolean;
  createdAt: string | Date;
  readAt?: string | Date | null;
}

export interface Contract {
  id: string;
  referenceNumber: string;
  operationType: OperationType;
  origin: string;
  destination: string;
  tripDate: string;
  tripTime: string;
  flightCarrier?: string | null;
  flightNumber?: string | null;
  customerName: string;
  customerPhone?: string | null;
  notes?: string | null;
  issueDate?: string | null;
  inspectionId?: string | null;
  captainId: string;
  captain?: SystemUser;
  vehiclePlate: string;
  pdfPath?: string | null;
  status?: ContractStatus;
  reviewNotes?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  passengers?: Passenger[];
  inspection?: VehicleInspection | null;
}
