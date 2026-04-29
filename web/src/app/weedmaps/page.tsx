import Link from 'next/link';
import { WeedmapsSearch } from '@/components/weedmaps-search';

export const metadata = {
  title: 'Dispensary Finder - x402-qai',
  description:
    'Find dispensaries and get product recommendations near any US location. Powered by x402.',
};

export default function WeedmapsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
          >
            &larr; x402-qai
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold font-mono mt-4">Dispensary Finder</h1>
          <p className="text-sm text-white/50 font-mono mt-2 max-w-xl leading-relaxed">
            Search nearby dispensaries, browse menus, and get product recommendations based on what
            you are looking for. US locations only.
          </p>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <WeedmapsSearch />
        </div>

        {/* How it works */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-white/40 mb-4">
            How it works
          </h2>
          <div className="space-y-3 text-sm font-mono text-white/40">
            <div className="flex gap-3">
              <span className="text-white/20 shrink-0">1.</span>
              <span>Enter a city, address, or coordinates</span>
            </div>
            <div className="flex gap-3">
              <span className="text-white/20 shrink-0">2.</span>
              <span>
                Optionally describe what you want: &quot;edibles for sleep&quot;, &quot;cheap
                vapes&quot;, &quot;strongest flower&quot;
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-white/20 shrink-0">3.</span>
              <span>Get ranked dispensaries with matching products, prices, and order links</span>
            </div>
          </div>
        </div>

        {/* x402 API section */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-white/40 mb-4">
            x402 API
          </h2>
          <p className="text-sm text-white/40 font-mono mb-3">
            Available as a paid x402 endpoint for agents and apps. $0.03 USDC per request, no API
            keys.
          </p>
          <div className="rounded-lg border border-white/5 bg-black p-3">
            <code className="text-[11px] text-white/50 font-mono break-all">
              bankr x402 call
              https://x402.bankr.bot/0x72e45a93491a6acfd02da6ceb71a903f3d3b6d08/weedmaps-recs -d
              {' \'{"location":"Phoenix, AZ","query":"edibles for sleep"}\''}
            </code>
          </div>
        </div>
      </div>
    </main>
  );
}
