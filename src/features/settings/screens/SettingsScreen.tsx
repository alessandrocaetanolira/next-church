'use client';

import type { ReactNode } from 'react';
import { WebPageLayout } from '@/components/shared/web';
import { useIsMobile } from '@/hooks/use-mobile';
import { SettingsTabs, type SettingsTab } from '@/app/settings/tabs/settingsTabs';
import { SettingsMobileView } from './SettingsMobileView';
import { SettingsWebView } from './SettingsWebView';

type SettingsScreenProps = {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  children: ReactNode;
};

/** Shell da tela de configurações; Views Web/Mobile são compostas dentro dele. */
export function SettingsScreen({ activeTab, onTabChange, children }: SettingsScreenProps) {
  const isMobile = useIsMobile();
  const View = isMobile ? SettingsMobileView : SettingsWebView;

  return (
    <WebPageLayout title="Configurações" description="Gerencie a aparência, identidade e recursos do seu aplicativo.">
      <SettingsTabs value={activeTab} onChange={onTabChange} />
      <View>{children}</View>
    </WebPageLayout>
  );
}
