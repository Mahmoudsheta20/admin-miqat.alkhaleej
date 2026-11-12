import { LayoutDashboard, FileText, ClipboardCheck, Car, UserCheck, Building2, Users, Contact, ReceiptText, ShoppingBag, Landmark, BookOpen, Calculator, ShieldCheck, Settings, MessageSquare, type LucideIcon } from "lucide-react";
const ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, contracts: FileText, inspection: ClipboardCheck, fleet: Car, captain: UserCheck, customers: Building2, staff: Users, representatives: Contact, invoice: ReceiptText, purchase: ShoppingBag, accounting: Landmark, accounts: BookOpen, vat: Calculator, company: Building2, tax: ShieldCheck, shield: ShieldCheck, whatsapp: MessageSquare };
export default function NavigationIcon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  const Icon = ICONS[name] || Settings;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.7} />;
}
