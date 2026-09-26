import { BookOpen, LayoutDashboard, Menu, MessageCircle, ShoppingCart } from 'lucide-react';

export type MobilePreviewPlatform = 'ios' | 'android';

interface MobileThemePreviewProps {
  platform?: MobilePreviewPlatform;
  appName: string;
  userName?: string;
  logoUrl?: string;
  accentColor?: string;
  dark?: boolean;
}

function PreviewLogo({ src, className }: { src: string; className: string }) {
  // O preview aceita Base64 e URLs dinâmicas; não deve passar pelo loader do Next Image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} />;
}

/** Simula o Dashboard mobile com o branding atualmente configurado. */
export function MobileThemePreview({
  platform = 'ios',
  appName,
  userName = 'Alessandro',
  logoUrl,
  accentColor = '#3b82f6',
  dark = false,
}: MobileThemePreviewProps) {
  const isIOS = platform === 'ios';
  const initials = (appName.trim().slice(0, 1) || 'A').toUpperCase();

  return (
    <div className={`theme-phone ${isIOS ? 'theme-ios' : 'theme-android'} ${dark ? 'theme-preview-dark' : ''}`} style={{ '--theme-preview-accent': accentColor } as React.CSSProperties}>
      {isIOS ? <div className="dynamic-island" /> : <div className="camera-hole" />}
      <div className="status-bar"><span>9:41</span><span>{isIOS ? '●●●  Wi-Fi  🔋' : 'Wi-Fi  ●●●  🔋'}</span></div>
      <main className="phone-content preview-dashboard-screen">
        <header className="preview-dashboard-header">
          <div><p className="preview-eyebrow">Dashboard</p><h1>Olá, {userName}</h1><span className="preview-dashboard-brand">{appName}</span></div>
          <div className="avatar">{logoUrl ? <PreviewLogo src={logoUrl} className="h-full w-full rounded-full object-cover" /> : initials}</div>
        </header>
        <section className="preview-welcome-card"><div><p>Comunidade</p><strong>Juntos na fé</strong><span>Veja as novidades da igreja</span></div><span className="preview-welcome-icon">✦</span></section>
        <p className="section-label">Acesso rápido</p>
        <section className="preview-dashboard-grid"><div className="preview-dashboard-card"><span>📖</span><strong>Bíblia</strong><small>Leia hoje</small></div><div className="preview-dashboard-card"><span>📅</span><strong>Eventos</strong><small>Próximos encontros</small></div><div className="preview-dashboard-card"><span>👥</span><strong>Grupos</strong><small>Minha comunidade</small></div><div className="preview-dashboard-card"><span>💳</span><strong>Carteira</strong><small>Saldo e pedidos</small></div></section>
        <p className="section-label">Atividade recente</p>
        <section className="preview-activity-card"><span className="preview-activity-dot" /><div><strong>Nova publicação no feed</strong><small>Há poucos minutos</small></div><span className="chevron">›</span></section>
      </main>
      <nav className="bottom-navigation">
        <div className="nav-item active"><div className="nav-icon"><LayoutDashboard /></div><span>Início</span></div>
        <div className="nav-item"><div className="nav-icon"><BookOpen /></div><span>Bíblia</span></div>
        <div className="nav-item"><div className="nav-icon"><MessageCircle /></div><span>Feed</span></div>
        <div className="nav-item"><div className="nav-icon"><ShoppingCart /></div><span>Cantina</span></div>
        <div className="nav-item"><div className="nav-icon"><Menu /></div><span>Mais</span></div>
      </nav>
      {isIOS && <div className="home-indicator" />}
    </div>
  );
}
