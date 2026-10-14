import { Calendar, Settings, Users, Gamepad2, Megaphone, Bell, Package, Layers, Heart, Baby, Car } from 'lucide-react';
import { APP_MODULE_PATHS, getAccessibleModules } from '@/lib/access-control';

const menu = [
  { module: 'schedules', icon: Calendar, label: 'Escalas' },
  { module: 'games', icon: Gamepad2, label: 'Jogos' },
  { module: 'groups', icon: Layers, label: 'Grupos' },
  { module: 'kids', icon: Baby, label: 'Infantil' },
  { module: 'socialProjects', icon: Heart, label: 'Proj. Sociais' },
  { module: 'parking', icon: Car, label: 'Estacion.' },
  { module: 'members', icon: Users, label: 'Membros' },
  { module: 'materials', icon: Package, label: 'Materiais' },
  { module: 'notifications', icon: Bell, label: 'Notificações' },
  { module: 'pastoral', icon: Megaphone, label: 'Área do Pastor' },
  { module: 'settings', icon: Settings, label: 'Configurações' },
] as const;

export function getMobileMenuItems(user: Parameters<typeof getAccessibleModules>[0]) {
  const modules = getAccessibleModules(user);
  return menu.filter((item) => modules.has(item.module))
    .map((item) => ({ ...item, to: APP_MODULE_PATHS[item.module] }));
}
