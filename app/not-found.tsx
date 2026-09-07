import Link from 'next/link';

import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="aurora flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="Vouch home">
          <Logo />
        </Link>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 text-center sm:px-6">
        <p className="tabular text-[13px] font-semibold tracking-[0.08em] text-brand-600">404</p>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.03em] text-ink">
          That page does not exist.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          The link may be out of date, or the campaign might have been created in a different browser —
          demo data lives in local storage rather than on a server.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/marketplace">
            <Button className="w-full sm:w-auto">Browse the marketplace</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary" className="w-full sm:w-auto">
              Back home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
