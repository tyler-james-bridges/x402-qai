import Link from 'next/link';
import { listWorkflows } from '@/lib/workflows';

export const metadata = {
  title: 'x402 Workflow Runner',
  description:
    'Browse example multi-step x402 workflows: research, trading, content, and agent pipelines with per-step cost breakdowns.',
};

export default function WorkflowsIndexPage() {
  const workflows = listWorkflows();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="text-xs text-white/40 hover:text-white/70 font-mono transition-colors"
            >
              &larr; qai scanner
            </Link>
            <div className="flex gap-4 text-xs font-mono">
              <Link href="/flow" className="text-white/40 hover:text-white/70 transition-colors">
                /flow
              </Link>
              <Link href="/explore" className="text-white/40 hover:text-white/70 transition-colors">
                /explore
              </Link>
              <span className="text-white/30">0x402.sh</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold font-mono tracking-tight">x402 Workflow Runner</h1>
          <p className="mt-3 text-lg text-white/60 font-mono">
            Chain paid endpoints into multi-step pipelines.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {workflows.map((wf) => (
            <Link
              key={wf.id}
              href={`/workflows/${wf.id}`}
              className="group flex flex-col rounded-lg border border-white/10 bg-white/5 p-5 font-mono transition-colors hover:border-white/30 hover:bg-white/[0.08]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-base font-bold text-white group-hover:text-white">{wf.name}</h2>
                <span className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                  {wf.steps.length} step{wf.steps.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed mb-4 min-h-[3rem]">
                {wf.description}
              </p>
              <ul className="space-y-1 mb-4">
                {wf.steps.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 text-[11px] text-white/50">
                    <span className="text-white/30">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-white/70 truncate">{s.name}</span>
                    <span className="ml-auto text-[10px] text-white/30">{s.method}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/40">View pipeline</span>
                <span className="text-[11px] text-white/70 group-hover:text-white transition-colors">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            Endpoints resolved from{' '}
            <a
              href="https://bankr.bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              bankr x402 marketplace
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
