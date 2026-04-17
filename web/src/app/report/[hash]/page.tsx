import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getReport } from '@/lib/report-store';
import { ReportView, type ReportPayload } from '@/components/report-view';

export const dynamic = 'force-dynamic';

export default async function ReportPage(props: PageProps<'/report/[hash]'>) {
  const { hash } = await props.params;
  const record = getReport(hash);
  if (!record) notFound();

  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const proto = headerList.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;

  const payload = record.payload as unknown as ReportPayload;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <nav className="mb-8 text-xs font-mono text-white/40">
          <Link href="/" className="hover:text-white/70 transition-colors">x402-qai</Link>
          <span className="mx-2 text-white/20">/</span>
          <span className="text-white/60">report</span>
          <span className="mx-2 text-white/20">/</span>
          <span className="text-white/60">{hash}</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-mono text-3xl font-bold tracking-tight">Scan report</h1>
          <p className="mt-2 font-mono text-sm text-white/60">
            Permanent URL for this scan. Share or embed the badge in a README.
          </p>
        </header>

        <ReportView hash={record.hash} origin={origin} payload={payload} />
      </div>
    </main>
  );
}
