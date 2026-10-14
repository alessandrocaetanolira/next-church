import { useAuthStore } from '@/features/auth/store';

/** Opt-in incident diagnostics. Enable with localStorage['church-debug-mobile-resume']='1'. */
export function logMobileResume(reason: string, session?: { status: string; role?: string; version?: number }) {
  try {
    if (window.localStorage.getItem('church-debug-mobile-resume') !== '1') return;
    const user = useAuthStore.getState().user;
    const rectangle = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      const rect = element?.getBoundingClientRect();
      return element && rect ? { top: rect.top, bottom: rect.bottom, height: rect.height,
        clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
        state: element.dataset.state, inlineHeight: element.style.height,
        inlineBottom: element.style.bottom, inlineMaxHeight: element.style.maxHeight } : null;
    };
    const items = [...document.querySelectorAll<HTMLElement>('[data-mobile-menu-item]')];
    console.info('[mobile-resume]', {
      at: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' }).format(new Date()),
      reason, visibility: document.visibilityState, online: navigator.onLine,
      session, access: user ? { role: user.role, version: user.version, modules: user.accessibleModules } : null,
      layoutHeight: window.innerHeight, visualHeight: window.visualViewport?.height,
      visualOffset: window.visualViewport?.offsetTop,
      shellHeight: document.documentElement.style.getPropertyValue('--app-viewport-height'),
      focus: document.activeElement?.tagName,
      shell: rectangle('.mobile-shell'), nav: rectangle('nav[aria-label="Navegação principal"]'),
      drawer: rectangle('[data-vaul-drawer]'), bodyStyle: {
        position: document.body.style.position, top: document.body.style.top, height: document.body.style.height,
        left: document.body.style.left, right: document.body.style.right,
        overflow: document.body.style.overflow, pointerEvents: document.body.style.pointerEvents,
      },
      menu: items.map((item) => ({ module: item.dataset.mobileMenuItem,
        top: item.getBoundingClientRect().top, opacity: window.getComputedStyle(item).opacity,
        transform: window.getComputedStyle(item).transform })),
    });
  } catch { /* Diagnostics must never change app behavior. */ }
}
