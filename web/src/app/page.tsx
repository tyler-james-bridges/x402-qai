import Link from 'next/link';
import { Scanner } from '@/components/scanner';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold font-mono tracking-tight">
            x402-qai
          </h1>
          <p className="mt-3 text-lg text-white/60 font-mono">
            Test x402 endpoints before your users do.
          </p>
          <p className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40 font-mono">
            <Link
              href="/explore"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              endpoint explorer &rarr;
            </Link>
            <Link
              href="/flow"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              flow visualizer &rarr;
            </Link>
          </p>
        </header>
        <Scanner />
        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            Part of the{' '}
            <a
              href="https://github.com/tyler-james-bridges/x402-qai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              QAI tooling ecosystem
            </a>
          </p>
          <p className="mt-2">
            <a
              href="https://www.npmjs.com/package/x402-qai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              npm install -g x402-qai
            </a>
          </p>
          <p className="mt-2">
            <Link
              href="/flow"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              /flow - payment handshake visualizer
            </Link>
          </p>
          <p className="mt-2">
            <Link
              href="/explore"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              /explore - x402 endpoint catalog
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
