// Loyalty program for canteen

export type PaymentMethodFilter = 'cash' | 'pix' | 'credit' | 'fiado';

export interface LoyaltyConfig {
  enabled: boolean;
  purchasesForReward: number; // e.g., every 10 purchases
  discountPercent: number; // e.g., 10% off
  description: string;
  validFrom: string; // ISO date
  validUntil: string; // ISO date
  eligiblePaymentMethods: PaymentMethodFilter[]; // empty = all methods
  minPurchaseValue: number; // minimum cart value per purchase to count
  minTotalSpent: number; // minimum total spent to be eligible for reward
}

export interface MemberLoyalty {
  memberId: string;
  purchaseCount: number;
  totalSpent: number;
  rewardsRedeemed: number;
  lastPurchaseDate: string;
}

const LOYALTY_CONFIG_KEY = 'cantina-loyalty-config';
const LOYALTY_DATA_KEY = 'cantina-loyalty-data';

const defaultConfig: LoyaltyConfig = {
  enabled: false,
  purchasesForReward: 10,
  discountPercent: 10,
  description: 'A cada {x} compras, ganhe {d}% de desconto na próxima!',
  validFrom: '',
  validUntil: '',
  eligiblePaymentMethods: [],
  minPurchaseValue: 0,
  minTotalSpent: 0,
};

export function getLoyaltyConfig(): LoyaltyConfig {
  if (typeof window === 'undefined') return defaultConfig;
  const stored = localStorage.getItem(LOYALTY_CONFIG_KEY);
  if (stored) return { ...defaultConfig, ...JSON.parse(stored) };
  return defaultConfig;
}

export function saveLoyaltyConfig(config: LoyaltyConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOYALTY_CONFIG_KEY, JSON.stringify(config));
}

export function isLoyaltyActive(config?: LoyaltyConfig): boolean {
  const c = config || getLoyaltyConfig();
  if (!c.enabled) return false;
  const now = new Date();
  if (c.validFrom && new Date(c.validFrom) > now) return false;
  if (c.validUntil && new Date(c.validUntil) < now) return false;
  return true;
}

export function isPaymentMethodEligible(method: string, config?: LoyaltyConfig): boolean {
  const c = config || getLoyaltyConfig();
  if (!c.eligiblePaymentMethods || c.eligiblePaymentMethods.length === 0) return true;
  return c.eligiblePaymentMethods.includes(method as PaymentMethodFilter);
}

export function getMemberLoyalty(memberId: string): MemberLoyalty {
  const all = getAllLoyaltyData();
  return all[memberId] || { memberId, purchaseCount: 0, totalSpent: 0, rewardsRedeemed: 0, lastPurchaseDate: '' };
}

export function getAllLoyaltyData(): Record<string, MemberLoyalty> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(LOYALTY_DATA_KEY);
  if (stored) return JSON.parse(stored);
  return {};
}

function saveAllLoyaltyData(data: Record<string, MemberLoyalty>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOYALTY_DATA_KEY, JSON.stringify(data));
}

export function recordPurchase(memberId: string, purchaseValue: number, paymentMethod: string): { newCount: number; hasReward: boolean } {
  const config = getLoyaltyConfig();
  
  if (!isLoyaltyActive(config)) return { newCount: 0, hasReward: false };
  if (!isPaymentMethodEligible(paymentMethod, config)) return { newCount: 0, hasReward: false };
  if (config.minPurchaseValue > 0 && purchaseValue < config.minPurchaseValue) return { newCount: 0, hasReward: false };

  const all = getAllLoyaltyData();
  const member = all[memberId] || { memberId, purchaseCount: 0, totalSpent: 0, rewardsRedeemed: 0, lastPurchaseDate: '' };
  
  member.purchaseCount += 1;
  member.totalSpent = (member.totalSpent || 0) + purchaseValue;
  member.lastPurchaseDate = new Date().toISOString();
  all[memberId] = member;
  saveAllLoyaltyData(all);
  
  const meetsSpentRequirement = config.minTotalSpent <= 0 || member.totalSpent >= config.minTotalSpent;
  const hasReward = member.purchaseCount >= config.purchasesForReward && meetsSpentRequirement;
  return { newCount: member.purchaseCount, hasReward };
}

export function redeemReward(memberId: string): boolean {
  const config = getLoyaltyConfig();
  if (!isLoyaltyActive(config)) return false;
  
  const all = getAllLoyaltyData();
  const member = all[memberId];
  if (!member || member.purchaseCount < config.purchasesForReward) return false;
  
  const meetsSpentRequirement = config.minTotalSpent <= 0 || (member.totalSpent || 0) >= config.minTotalSpent;
  if (!meetsSpentRequirement) return false;
  
  member.purchaseCount -= config.purchasesForReward;
  member.rewardsRedeemed += 1;
  all[memberId] = member;
  saveAllLoyaltyData(all);
  return true;
}

export function getLoyaltyProgress(memberId: string): { current: number; target: number; percentage: number; hasReward: boolean; totalSpent: number } {
  const config = getLoyaltyConfig();
  const member = getMemberLoyalty(memberId);
  const target = config.purchasesForReward;
  const current = member.purchaseCount % target || (member.purchaseCount >= target ? target : 0);
  const meetsSpentRequirement = config.minTotalSpent <= 0 || (member.totalSpent || 0) >= config.minTotalSpent;
  const hasReward = member.purchaseCount >= target && meetsSpentRequirement;
  
  return {
    current: hasReward ? target : current,
    target,
    percentage: Math.min((current / target) * 100, 100),
    hasReward,
    totalSpent: member.totalSpent || 0,
  };
}

export function formatLoyaltyValidity(config: LoyaltyConfig): string {
  const parts: string[] = [];
  if (config.validFrom) {
    parts.push(`De ${new Date(config.validFrom).toLocaleDateString('pt-BR')}`);
  }
  if (config.validUntil) {
    parts.push(`até ${new Date(config.validUntil).toLocaleDateString('pt-BR')}`);
  }
  if (parts.length === 0) return 'Sem prazo definido';
  return parts.join(' ');
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodFilter, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  credit: 'Cartão',
  fiado: 'Fiado',
};
