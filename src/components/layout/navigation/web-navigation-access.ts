import { getAccessibleModules } from "@/lib/access-control";
import { WEB_NAVIGATION, type WebNavigationGroup, type WebNavigationItem } from "./web-navigation";

type NavigationUser = Parameters<typeof getAccessibleModules>[0];

export type VisibleWebNavigationGroup = {
  group: WebNavigationGroup;
  items: WebNavigationItem[];
};

export function getVisibleWebNavigation(user: NavigationUser): VisibleWebNavigationGroup[] {
  const accessibleModules = getAccessibleModules(user);
  const isPlatformAdmin = user?.isPlatformAdmin === true;

  return WEB_NAVIGATION.map((group) => ({
    group,
    items: group.items.filter((item) => {
      if (item.platformAdminOnly) return isPlatformAdmin;
      return item.module ? accessibleModules.has(item.module) : true;
    }),
  })).filter(({ group, items }) => {
    if (group.hiddenForPlatformAdmin && isPlatformAdmin) return false;
    if (group.platformAdminOnly && !isPlatformAdmin) return false;
    return items.length > 0;
  });
}
