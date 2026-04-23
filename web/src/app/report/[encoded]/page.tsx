import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { scan } from 'x402-qai';
import {
  scoreToGrade,
  gradeColor,
  categoryLabel,
  safeDecodeUrl,
  type ScanResult,
} from '@/lib/grade';
import { ReportActions } from '@/components/report-actions';
import { BadgeEmbed } from '@/components/badge-embed';

export const revalidate = 300;

interface ReportProps {
  params: Promise<{ encoded: string }>;
}

async function runScan(url: string): Promise<ScanResult | null> {
  try {
    const result = await scan(url, {
      pay: false,
      timeout: 15000,
      format: 'json',
    });
    return result as ScanResult;
  } catch {
    return null;
  }
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'qai.0x402.sh';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: ReportProps): Promise<Metadata> {
  const { encoded } = await params;
  const url = safeDecodeUrl(encoded);
  if (!url) return { title: 'Invalid Report URL' };

  const safeEncoded = encodeURIComponent(url);
  const origin = await getOrigin();
  const ogImage = `${origin}/api/og/${safeEncoded}`;
  const reportUrl = `${origin}/report/${safeEncoded}`;
  const title = `x402 compliance report - ${url}`;
  const description = `Compliance scan results for ${url}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: reportUrl,
      siteName: 'x402-qai',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ReportPage({ params }: ReportProps) {
  const { encoded } = await params;
  const url = safeDecodeUrl(encoded);
  if (!url) notFound();

  const safeEncoded = encodeURIComponent(url);
  const result = await runScan(url);
  if (!result) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <ReportHeader encoded={safeEncoded} />
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 font-mono">
            <h2 className="text-base font-bold text-red-400 mb-2">Scan failed</h2>
            <p className="text-sm text-red-300 break-all">{url}</p>
            <p className="mt-3 text-xs text-white/50">
              The scanner could not reach this endpoint. Verify the URL and try again.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const origin = await getOrigin();
  const shareUrl = `${origin}/report/${safeEncoded}`;
  const grade = scoreToGrade(result.score.total);
  const color = gradeColor(grade);

  const failed = result.rules.filter((r) => !r.passed);
  const passed = result.rules.filter((r) => r.passed);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ReportHeader encoded={safeEncoded} />

        <section className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-mono">
                {new Date(result.timestamp).toLocaleString()}
              </p>
              <p className="mt-1 break-all text-sm text-white/80 font-mono">{result.url}</p>
              <div className="mt-4">
                <ReportActions shareUrl={shareUrl} />
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 font-mono text-5xl font-bold"
                style={{ borderColor: color, color }}
              >
                {grade}
              </div>
              <div className="font-mono">
                <div className="text-3xl font-bold" style={{ color }}>
                  {result.score.total}
                  <span className="text-base text-white/40">/100</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  {result.passed ? 'pass' : 'fail'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {result.errors.length > 0 && (
          <section className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 font-mono">
            <h3 className="mb-2 text-xs font-bold text-red-400 uppercase tracking-wider">Errors</h3>
            {result.errors.map((err, i) => (
              <p key={i} className="text-sm text-red-300 break-all">
                {err}
              </p>
            ))}
          </section>
        )}

        <section className="mb-8 rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-xs font-bold text-white/40 font-mono uppercase tracking-wider">
            Score Breakdown
          </h2>
          <div className="space-y-3 font-mono">
            {result.score.categories.map((cat) => {
              const pct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
              const barColor =
                pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={cat.category}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-white/70">{categoryLabel(cat.category)}</span>
                    <span className="text-sm text-white/50">
                      {cat.score}/{cat.maxScore}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className={`h-2 rounded-full ${barColor} transition-all duration-500 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xs font-bold text-white/40 font-mono uppercase tracking-wider">
            Rules ({passed.length}/{result.rules.length} passed)
          </h2>
          {result.rules.length === 0 ? (
            <p className="text-sm text-white/50 font-mono">No rules evaluated.</p>
          ) : (
            <div className="space-y-2 font-mono">
              {result.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-lg border p-3 ${
                    rule.passed
                      ? 'border-white/5 bg-white/[0.02]'
                      : rule.severity === 'warn'
                        ? 'border-yellow-500/20 bg-yellow-500/5'
                        : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <RuleStatus passed={rule.passed} severity={rule.severity} />
                        <span className="text-sm text-white/80">{rule.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/40">{rule.message}</p>
                      {rule.suggestion && !rule.passed && (
                        <p className="mt-1 text-xs text-white/50">Fix: {rule.suggestion}</p>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-white/20">{rule.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {failed.length === 0 && result.rules.length > 0 && (
            <p className="mt-3 text-sm text-green-500/70 font-mono">
              All {result.rules.length} rules passed.
            </p>
          )}
        </section>

        <section className="mb-12">
          <BadgeEmbed encoded={safeEncoded} origin={origin} />
        </section>

        <footer className="border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            Generated by{' '}
            <Link href="/" className="text-white/60 hover:text-white underline">
              x402-qai
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

function ReportHeader({ encoded }: { encoded: string }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <Link href="/" className="text-xs text-white/40 hover:text-white/70 font-mono">
        &larr; x402-qai
      </Link>
      <div className="flex gap-4 text-xs font-mono">
        <Link href={`/?url=${encoded}`} className="text-white/40 hover:text-white/70">
          rescan
        </Link>
        <Link href="/explore" className="text-white/40 hover:text-white/70">
          explore
        </Link>
      </div>
    </header>
  );
}

function RuleStatus({ passed, severity }: { passed: boolean; severity: string }) {
  if (passed) return <span className="font-bold text-green-500">PASS</span>;
  if (severity === 'warn') return <span className="font-bold text-yellow-500">WARN</span>;
  return <span className="font-bold text-red-500">FAIL</span>;
}
