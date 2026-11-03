import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/brand/logo.png";

/**
 * Brand logo extracted from the client's flyer (public/brand/logo.png).
 * TODO(client): replace with the original vector/hi-res logo file from the
 * designer — keep the same path and the component needs no changes.
 */
export function Logo({ className = "h-10 w-auto", priority = false, href = "/" }: { className?: string; priority?: boolean; href?: string | null }) {
  const img = (
    <Image src={logo} alt="Sportaonica — početna stranica" className={className} priority={priority} sizes="(max-width: 640px) 170px, 240px" />
  );
  if (!href) return img;
  return (
    <Link href={href} className="inline-flex shrink-0 items-center rounded-xl">
      {img}
    </Link>
  );
}
