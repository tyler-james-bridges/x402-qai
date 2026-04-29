import Link from 'next/link';
import { Scanner } from '@/components/scanner';

const tools = [
  {
    href: '/explore',
    title: 'Endpoint Explorer',
    description:
      'Browse and search 100+ x402 services. See pricing, schemas, and compliance grades.',
    cta: 'Browse endpoints',
    stats: '100+ endpoints',
  },
  {
    href: '/flow',
    title: 'Payment Flow',
    description: 'Visualize the full x402 payment handshake step by step. Dry-run any endpoint.',
    cta: 'Run a flow',
    stats: '6-step trace',
  },
  {
    href: '/workflows',
    title: 'Workflow Runner',
    description:
      'Chain multiple x402 endpoints into a pipeline. Estimate total costs before you pay.',
    cta: 'View workflows',
    stats: '5 templates',
  },
  {
    href: '/weedmaps',
    title: 'Dispensary Finder',
    description:
      'Search nearby dispensaries and get product recommendations by preference. US locations.',
    cta: 'Find dispensaries',
    stats: 'Live menus',
  },
];

const endpoints = [
  { name: 'lint', price: '$0.01', description: 'Full compliance scan with grade' },
  { name: 'health', price: '$0.001', description: 'Quick alive + 402 check' },
  { name: 'explore', price: '$0.005', description: 'Search x402 marketplace' },
  { name: 'workflow-estimate', price: '$0.005', description: 'Cost estimate for pipelines' },
  { name: 'preflight', price: '$0.005', description: 'Pre-payment validation' },
  { name: 'trust', price: '$0.001', description: 'Endpoint trust check' },
  { name: 'weedmaps-recs', price: '$0.03', description: 'Dispensary finder + product recs' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-12">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold font-mono tracking-tight">x402-qai</h1>
          <p className="mt-4 text-xl md:text-2xl text-white/60 font-mono max-w-2xl mx-auto leading-relaxed">
            Developer tools for x402. Scan, explore, visualize, and test paid API endpoints.
          </p>
        </div>
      </section>

      {/* Scanner */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-white/40 mb-4">
            Compliance Scanner
          </h2>
          <Scanner />
        </div>
      </section>

      {/* Tools Grid */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="text-sm font-mono uppercase tracking-wider text-white/40 mb-6">Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:border-white/25 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold font-mono text-white group-hover:text-white/90">
                  {tool.title}
                </h3>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider shrink-0 ml-2 mt-1">
                  {tool.stats}
                </span>
              </div>
              <p className="text-sm text-white/50 font-mono leading-relaxed mb-4">
                {tool.description}
              </p>
              <span className="text-xs font-mono text-white/60 group-hover:text-white/80 transition-colors">
                {tool.cta} &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Paid API Endpoints */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-mono uppercase tracking-wider text-white/40">
              x402 Paid API
            </h2>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
              USDC on Base
            </span>
          </div>
          <p className="text-sm text-white/50 font-mono mb-6">
            All tools available as x402 endpoints. No API keys. Pay per request with your wallet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {endpoints.map((ep) => (
              <div
                key={ep.name}
                className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 font-mono"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/80 font-bold">{ep.name}</span>
                  <span className="text-[11px] text-green-400">{ep.price}</span>
                </div>
                <p className="text-[11px] text-white/40">{ep.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <code className="text-[11px] text-white/30 font-mono break-all">
              bankr x402 call https://x402.bankr.bot/0x72e45a.../lint -i
            </code>
          </div>
        </div>
      </section>

      {/* Badge / Social Proof */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-white/40 mb-4">
            Compliance Badges
          </h2>
          <p className="text-sm text-white/50 font-mono mb-4">
            Scan any endpoint and get an embeddable badge for your README.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center rounded font-mono text-[11px]">
              <span className="bg-white/10 text-white/70 px-2 py-1 rounded-l border border-white/10">
                x402
              </span>
              <span className="bg-green-600/80 text-white px-2 py-1 rounded-r border border-green-500/30">
                A
              </span>
            </span>
            <span className="inline-flex items-center rounded font-mono text-[11px]">
              <span className="bg-white/10 text-white/70 px-2 py-1 rounded-l border border-white/10">
                x402
              </span>
              <span className="bg-blue-600/80 text-white px-2 py-1 rounded-r border border-blue-500/30">
                B
              </span>
            </span>
            <span className="inline-flex items-center rounded font-mono text-[11px]">
              <span className="bg-white/10 text-white/70 px-2 py-1 rounded-l border border-white/10">
                x402
              </span>
              <span className="bg-yellow-600/80 text-white px-2 py-1 rounded-r border border-yellow-500/30">
                C
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-4 pb-16">
        <div className="border-t border-white/10 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/30 font-mono">
          <div className="flex gap-4">
            <a
              href="https://github.com/tyler-james-bridges/x402-qai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/x402-qai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              npm
            </a>
            <a
              href="https://bankr.bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              Bankr
            </a>
          </div>
          <span>qai.0x402.sh</span>
        </div>
      </footer>
    </main>
  );
}
