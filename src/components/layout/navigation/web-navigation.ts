import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Car,
  CreditCard,
  Gamepad2,
  Heart,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  UserCircle,
} from "lucide-react";
import type { AppModule } from "@/lib/access-control";

export type WebNavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  module?: AppModule;
  platformAdminOnly?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export type WebNavigationGroup = {
  id: string;
  label: string;
  items: WebNavigationItem[];
  hiddenForPlatformAdmin?: boolean;
  platformAdminOnly?: boolean;
  destructive?: boolean;
};

export const WEB_NAVIGATION: WebNavigationGroup[] = [
  {
    id: "main",
    label: "Principal",
    hiddenForPlatformAdmin: true,
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
      { to: "/schedules", icon: Calendar, label: "Escalas", module: "schedules" },
      { to: "/groups", icon: Layers, label: "Grupos", module: "groups" },
      { to: "/kids", icon: Baby, label: "Infantil", module: "kids" },
      { to: "/social-projects", icon: Heart, label: "Projetos Sociais", module: "socialProjects" },
      { to: "/parking", icon: Car, label: "Estacionamento", module: "parking" },
      { to: "/members", icon: UserPlus, label: "Membros", module: "members" },
      { to: "/materials", icon: Package, label: "Materiais", module: "materials" },
      { to: "/jogos-novos", icon: Gamepad2, label: "Jogos", module: "games" },
      { to: "/bible", icon: BookOpen, label: "Bíblia", module: "bible" },
      { to: "/feed", icon: MessageCircle, label: "Comunidade", module: "feed" },
      { to: "/notifications", icon: Bell, label: "Notificações", module: "notifications" },
    ],
  },
  {
    id: "canteen",
    label: "Cantina",
    items: [{ to: "/cantina", icon: ShoppingCart, label: "Cantina", module: "canteen" }],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      { to: "/pastoral", icon: Megaphone, label: "Área do Pastor", module: "pastoral" },
      { to: "/minha-conta", icon: UserCircle, label: "Minha conta" },
      { to: "/settings", icon: Settings, label: "Configurações", module: "settings" },
    ],
  },
  {
    id: "platform-admin",
    label: "Global Admin",
    platformAdminOnly: true,
    destructive: true,
    items: [
      { to: "/admin", icon: Building2, label: "Visão geral", platformAdminOnly: true },
      { to: "/admin/tenants", icon: ShieldCheck, label: "Gerenciar Tenants", platformAdminOnly: true },
      { to: "/admin/plans", icon: CreditCard, label: "Planos", platformAdminOnly: true },
    ],
  },
];
