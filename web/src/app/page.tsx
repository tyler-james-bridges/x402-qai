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
          <nav className="mt-6 flex items-center justify-center gap-4 font-mono text-xs">
            <Link href="/explore" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-white/70 hover:border-white/40 hover:text-white transition-colors">
              /explore
            </Link>
            <Link href="/flow" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-white/70 hover:border-white/40 hover:text-white transition-colors">
              /flow
            </Link>
          </nav>
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
        </footer>
      </div>
    </main>
  );
}
