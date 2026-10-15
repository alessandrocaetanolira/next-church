export const PRODUCT_RECOMMENDATION_DAYS = 30;

type ProductRecommendation = {
  recommended?: boolean;
  recommendationCalculatedAt?: string;
  active?: boolean;
  availableToday?: boolean;
  stock: number;
};

/** Usa o último resultado do servidor offline, sem promover produtos pela sacola local.
 * Um destaque sem data válida ou mais antigo que sua janela não é apresentado como atual. */
export function isRecommendedProduct(product: ProductRecommendation, now = Date.now()) {
  const calculatedAt = Date.parse(product.recommendationCalculatedAt ?? '');
  return product.recommended === true && product.active !== false && product.availableToday !== false && product.stock > 0
    && Number.isFinite(calculatedAt) && calculatedAt <= now
    && now - calculatedAt < PRODUCT_RECOMMENDATION_DAYS * 24 * 60 * 60 * 1000;
}
