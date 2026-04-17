import Link from 'next/link';
import { FlowScanner } from '@/components/flow-scanner';

export const metadata = {
  title: 'x402 Flow Visualizer',
  description: 'Watch the x402 payment handshake play out step by step.',
};

export default function FlowPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <header className="mb-10">
          <nav className="mb-8 text-xs font-mono text-white/40">
            <Link href="/" className="hover:text-white/70 transition-colors">
              x402-qai
            </Link>
            <span className="mx-2 text-white/20">/</span>
            <span className="text-white/60">flow</span>
          </nav>
          <h1 className="text-4xl font-bold font-mono tracking-tight">
            Flow visualizer
          </h1>
          <p className="mt-3 text-lg text-white/60 font-mono">
            Watch the x402 handshake play out as an animated network diagram.
          </p>
        </header>

        <FlowScanner />

        <section className="mt-16 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
            Legend
          </h2>
          <ul className="space-y-2 text-xs font-mono text-white/60">
            <li><span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2" />success — step completed as expected</li>
            <li><span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mr-2" />warning — non-standard but tolerated</li>
            <li><span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2" />failure — trace stopped here</li>
            <li><span className="inline-block h-2 w-2 rounded-full bg-white/20 mr-2" />skipped — not attempted (no wallet configured)</li>
          </ul>
          <p className="mt-4 text-xs font-mono text-white/40">
            Click any step to expand full headers / payload.
          </p>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            <Link href="/explore" className="text-white/60 hover:text-white transition-colors underline">
              Browse the endpoint catalog
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
