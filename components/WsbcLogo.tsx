import Image from "next/image";

import wsbcLogo from "../wsbc logo.jpg";

type WsbcLogoProps = {
  className?: string;
  size?: number;
};

export default function WsbcLogo({ className, size = 36 }: WsbcLogoProps) {
  return (
    <Image
      src={wsbcLogo}
      alt="Wisconsin Sports Business Conference logo"
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}
