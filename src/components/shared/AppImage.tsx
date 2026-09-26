import Image, { type ImageProps } from 'next/image';

type AppImageProps = Omit<ImageProps, 'src'> & {
  src: string;
};

/** Imagens de uploads e provedores externos sem exigir hosts fixos no Next. */
export function AppImage({ src, alt = '', ...props }: AppImageProps) {
  return <Image {...props} src={src} alt={alt} unoptimized loader={({ src: imageSrc }) => imageSrc} />;
}
