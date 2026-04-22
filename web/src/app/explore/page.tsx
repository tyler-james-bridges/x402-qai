import Link from 'next/link';
import { ExploreBrowser } from '@/components/explore-browser';

export const metadata = {
  title: 'x402 Endpoint Explorer',
  description: 'Browse and test every x402 service.',
};

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="text-xs text-white/40 hover:text-white/70 font-mono transition-colors"
            >
              &larr; qai scanner
            </Link>
            <div className="flex gap-4 text-xs font-mono">
              <Link
                href="/flow"
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                /flow
              </Link>
              <Link
                href="/workflows"
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                /workflows
              </Link>
              <span className="text-white/30">0x402.sh</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold font-mono tracking-tight">
            x402 Endpoint Explorer
          </h1>
          <p className="mt-3 text-lg text-white/60 font-mono">
            Browse and test every x402 service.
          </p>
        </header>

        <ExploreBrowser />

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            Data from{' '}
            <a
              href="https://bankr.bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              bankr x402 marketplace
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
