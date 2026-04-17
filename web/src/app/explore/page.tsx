import Link from 'next/link';
import { SEED_CATALOG } from '@/lib/catalog';
import { CatalogBrowser } from '@/components/catalog-filters';

export const metadata = {
  title: 'x402 endpoint catalog',
  description: 'Browse every x402 endpoint, scored for compliance.',
};

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <header className="mb-10">
          <nav className="mb-8 text-xs font-mono text-white/40">
            <Link href="/" className="hover:text-white/70 transition-colors">
              x402-qai
            </Link>
            <span className="mx-2 text-white/20">/</span>
            <span className="text-white/60">explore</span>
          </nav>
          <h1 className="text-4xl font-bold font-mono tracking-tight">
            endpoint catalog
          </h1>
          <p className="mt-3 text-lg text-white/60 font-mono">
            Every x402 endpoint we have indexed, scored, and ready to browse.
          </p>
        </header>

        <CatalogBrowser entries={SEED_CATALOG} />

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            <Link href="/flow" className="text-white/60 hover:text-white transition-colors underline">
              Visualize a payment flow &rarr;
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
