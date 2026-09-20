export const PLAN_FEATURES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Resumo da igreja' },
  { key: 'members', label: 'Membros', description: 'Cadastro e gestão de membros' },
  { key: 'groups', label: 'Grupos e equipes', description: 'Grupos, equipes e escalas' },
  { key: 'canteen', label: 'Cantina', description: 'Produtos, vendas e fiado' },
  { key: 'pastoral', label: 'Área pastoral', description: 'Acompanhamento pastoral' },
  { key: 'materials', label: 'Materiais', description: 'Controle de materiais' },
  { key: 'tasks', label: 'Tarefas e escalas', description: 'Tarefas e escalas operacionais' },
  { key: 'games', label: 'Jogos e quiz', description: 'Jogos, quiz e ranking' },
  { key: 'kids', label: 'Infantil', description: 'Cadastro e atividades infantis' },
  { key: 'parking', label: 'Estacionamento', description: 'Vagas e avisos do estacionamento' },
  { key: 'social_projects', label: 'Projetos sociais', description: 'Projetos e ações sociais' },
  { key: 'feed', label: 'Comunidade', description: 'Feed e comunicação da igreja' },
  { key: 'bible', label: 'Bíblia', description: 'Leitura e conteúdo bíblico' },
  { key: 'notifications', label: 'Notificações', description: 'Central de notificações' },
  { key: 'offline_sync', label: 'Offline e sincronização', description: 'Uso offline e sincronização' },
  { key: 'engagement', label: 'Engajamento', description: 'Perfil e métricas de engajamento' },
  { key: 'settings', label: 'Configurações', description: 'Branding e configurações da igreja' },
] as const;

export type PlanFeature = typeof PLAN_FEATURES[number]['key'];

export function normalizePlanFeatures(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value.map((feature) => feature.trim().toLowerCase()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((feature) => feature.trim().toLowerCase()).filter(Boolean);
  return [];
}

export const PLAN_FEATURE_BY_PERMISSION: Record<string, PlanFeature> = {
  canteen: 'canteen',
  materials: 'materials',
  pastor: 'pastoral',
  tasks: 'tasks',
  teams: 'groups',
  settings: 'settings',
};

export function getPlanFeatureForPath(pathname: string): PlanFeature | undefined {
  const paths: Array<[string, PlanFeature]> = [
    ['/api/sync', 'offline_sync'],
    ['/api/engagement', 'engagement'],
    ['/api/canteen', 'canteen'],
    ['/api/materials', 'materials'],
    ['/api/members', 'members'],
    ['/api/groups', 'groups'],
    ['/api/teams', 'groups'],
    ['/api/schedules', 'tasks'],
    ['/api/pastoral', 'pastoral'],
    ['/api/kids', 'kids'],
    ['/api/parking', 'parking'],
    ['/api/feed', 'feed'],
    ['/api/bible', 'bible'],
    ['/api/quiz', 'games'],
    ['/api/notifications', 'notifications'],
    ['/api/settings', 'settings'],
    ['/kids', 'kids'],
    ['/parking', 'parking'],
    ['/social-projects', 'social_projects'],
    ['/feed', 'feed'],
    ['/bible', 'bible'],
    ['/notifications', 'notifications'],
    ['/carteira', 'members'],
    ['/offline', 'offline_sync'],
  ];
  return paths.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
}
