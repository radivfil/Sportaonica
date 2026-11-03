import Link from "next/link";
import { BeachBall } from "@/components/ui/Doodles";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-flyer px-4 text-center">
      <BeachBall className="h-24 w-24 animate-bounce-ball" />
      <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">Ups, lopta je odletjela!</h1>
      <p className="mt-3 max-w-md text-lg text-ink-soft">Stranica koju tražite ne postoji ili je premještena.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary">Na početnu</Link>
        <Link href="/upisi" className="btn-secondary">Termini i upisi</Link>
      </div>
    </main>
  );
}
