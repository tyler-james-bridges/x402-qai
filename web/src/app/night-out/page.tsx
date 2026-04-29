import Link from 'next/link';
import { NightOutSearch } from '@/components/night-out-search';

export const metadata = {
  title: 'Night Out Planner - x402-qai',
  description:
    'Plan a night out near any US location. Dispensaries, restaurants, bars, and breweries in one search.',
};

export default function NightOutPage() {
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
          <h1 className="text-3xl md:text-4xl font-bold font-mono mt-4">Night Out</h1>
          <p className="text-sm text-white/50 font-mono mt-2 max-w-xl leading-relaxed">
            Multi-source local discovery. Dispensaries with menu picks, restaurants, bars, and
            breweries near any US location. One search, full plan.
          </p>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <NightOutSearch />
        </div>

        {/* Sources */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-white/40 mb-4">
            Data sources
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Weedmaps', desc: 'Dispensaries + menus' },
              { name: 'OpenStreetMap', desc: 'Bars + restaurants' },
              { name: 'OpenBreweryDB', desc: 'Craft breweries' },
              { name: 'Nominatim', desc: 'Geocoding' },
            ].map((s) => (
              <div key={s.name} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <p className="text-xs font-mono font-bold text-white/60">{s.name}</p>
                <p className="text-[10px] font-mono text-white/25 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* x402 API */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-white/40 mb-4">
            x402 API
          </h2>
          <p className="text-sm text-white/40 font-mono mb-3">
            $0.05 USDC per request. Hits 4 data sources in parallel. No API keys needed.
          </p>
          <div className="rounded-lg border border-white/5 bg-black p-3">
            <code className="text-[11px] text-white/50 font-mono break-all">
              bankr x402 call -X POST
              https://x402.bankr.bot/0x72e45a93491a6acfd02da6ceb71a903f3d3b6d08/night-out -d
              {' \'{"location":"Scottsdale, AZ"}\''}
            </code>
          </div>
        </div>
      </div>
    </main>
  );
}
