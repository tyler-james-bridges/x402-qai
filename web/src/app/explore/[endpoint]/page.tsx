import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SEED_CATALOG, findEntry } from '@/lib/catalog';
import { EndpointDetail } from '@/components/endpoint-detail';

export async function generateStaticParams() {
  return SEED_CATALOG.map((entry) => ({ endpoint: entry.slug }));
}

export default async function EndpointPage(props: PageProps<'/explore/[endpoint]'>) {
  const { endpoint } = await props.params;
  const entry = findEntry(endpoint);
  if (!entry) notFound();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <nav className="mb-8 text-xs font-mono text-white/40">
          <Link href="/" className="hover:text-white/70 transition-colors">x402-qai</Link>
          <span className="mx-2 text-white/20">/</span>
          <Link href="/explore" className="hover:text-white/70 transition-colors">explore</Link>
          <span className="mx-2 text-white/20">/</span>
          <span className="text-white/60">{entry.slug}</span>
        </nav>

        <EndpointDetail entry={entry} />

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            <Link href="/explore" className="text-white/60 hover:text-white transition-colors underline">
              &larr; Back to catalog
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
