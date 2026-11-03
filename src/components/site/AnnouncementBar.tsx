import Link from "next/link";
import { Sparkle } from "@/components/ui/Doodles";

export function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="bg-navy text-white">
      <div className="container flex min-h-[40px] items-center justify-center gap-2 py-2 text-center text-sm font-bold">
        <Sparkle className="h-4 w-4 shrink-0" fill="#F7EFB5" />
        <span>{text}</span>
        <Link href="/upisi" className="whitespace-nowrap underline decoration-butter-300 decoration-2 underline-offset-4 hover:text-butter-100">
          Prijavi se →
        </Link>
      </div>
    </div>
  );
}
