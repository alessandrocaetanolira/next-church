export type MobileBackTarget = {
  href: string;
  label: string;
  title: string;
};

/**
 * Define o chrome das rotas internas no mobile.
 *
 * Listagens e hubs mantêm o TopBar padrão e a NavBottom. Formulários, edição
 * e detalhes são fluxos imersivos: TopBar contextual com retorno e sem NavBottom.
 */
export function getMobileBackTarget(pathname: string): MobileBackTarget | null {
  if (/^\/feed\/[^/]+\/comments\/new$/.test(pathname)) return { href: `/feed/${pathname.split('/')[2]}`, label: 'Publicação', title: 'Novo comentário' };
  if (/^\/feed\/[^/]+$/.test(pathname)) return { href: '/feed', label: 'Feed', title: 'Publicação' };
  if (pathname === '/members/new') return { href: '/members', label: 'Membros', title: 'Novo membro' };
  if (pathname === '/groups/new') return { href: '/groups', label: 'Grupos', title: 'Novo grupo' };
  if (pathname === '/minha-conta/perfil') return { href: '/minha-conta', label: 'Minha conta', title: 'Meu perfil' };
  if (/^\/groups\/[^/]+\/edit$/.test(pathname)) return { href: `/groups/${pathname.split('/')[2]}`, label: 'Grupo', title: 'Editar grupo' };
  if (pathname === '/kids/new') return { href: '/kids', label: 'Infantil', title: 'Novo cadastro' };
  if (/^\/kids\/[^/]+\/edit$/.test(pathname)) return { href: '/kids', label: 'Infantil', title: 'Editar cadastro' };
  if (/^\/members\/[^/]+\/edit$/.test(pathname)) return { href: `/members/${pathname.split('/')[2]}`, label: 'Membro', title: 'Editar membro' };
  if (/^\/members\/[^/]+\/access$/.test(pathname)) return { href: `/members/${pathname.split('/')[2]}`, label: 'Membro', title: 'Acesso e permissões' };
  if (/^\/members\/[^/]+$/.test(pathname)) return { href: '/members', label: 'Membros', title: 'Detalhes do membro' };
  if (/^\/groups\/[^/]+$/.test(pathname)) return { href: '/groups', label: 'Grupos', title: 'Detalhes do grupo' };
  if (pathname === '/schedules/new') return { href: '/schedules', label: 'Escalas', title: 'Nova escala' };
  if (pathname === '/cantina/products/new') return { href: '/cantina', label: 'Cantina', title: 'Novo produto' };
  if (pathname === '/cantina/checkout') return { href: '/cantina?tab=pdv', label: 'PDV', title: 'Finalizar venda' };
  if (/^\/cantina\/products\/[^/]+\/edit$/.test(pathname)) return { href: `/cantina/products/${pathname.split('/')[3]}`, label: 'Produto', title: 'Editar produto' };
  if (/^\/cantina\/products\/[^/]+$/.test(pathname)) return { href: '/cantina', label: 'Cantina', title: 'Detalhes do produto' };
  return null;
}
