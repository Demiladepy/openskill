import Image from "next/image";

export function ForgeLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/forge-logo.png"
      alt="Forge Skills"
      width={size}
      height={size}
      className="forgeLogoImg"
      priority
    />
  );
}
