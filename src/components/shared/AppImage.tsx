import type { ImgHTMLAttributes } from 'react';

type AppImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
};

/** Imagens de uploads, Base64 e provedores externos sem exigir configuração do Next Image. */
export function AppImage({ src, alt = '', ...props }: AppImageProps) {
  // Logos e uploads podem chegar sem dimensões fixas; o elemento nativo evita quebra no mobile.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={src} alt={alt} />;
}
