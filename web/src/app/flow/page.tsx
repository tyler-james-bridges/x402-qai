import Link from 'next/link';
import { PaymentFlow } from '@/components/payment-flow';

export const metadata = {
  title: 'x402 Flow Visualizer',
  description:
    'Watch the x402 payment handshake unfold in real time: request, 402 response, requirements parsing, signature, submission, and settlement.',
};

export default function FlowPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="text-xs text-white/40 hover:text-white/70 font-mono transition-colors"
            >
              &larr; qai scanner
            </Link>
            <div className="flex gap-4 text-xs font-mono">
              <Link
                href="/explore"
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                /explore
              </Link>
              <span className="text-white/30">0x402.sh</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold font-mono tracking-tight">
            x402 Flow Visualizer
          </h1>
          <p className="mt-3 text-lg text-white/60 font-mono">
            Watch the x402 payment handshake in real-time.
          </p>
        </header>

        <PaymentFlow />

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
        </footer>
      </div>
    </main>
  );
}
