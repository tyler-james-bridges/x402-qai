import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkflow, toYaml } from '@/lib/workflows';
import { WorkflowRunner } from '@/components/workflow-runner';

interface WorkflowDetailProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WorkflowDetailProps) {
  const { id } = await params;
  const wf = getWorkflow(id);
  if (!wf) return { title: 'Workflow Not Found' };
  return {
    title: `${wf.name} — x402 Workflow`,
    description: wf.description,
  };
}

export default async function WorkflowDetailPage({ params }: WorkflowDetailProps) {
  const { id } = await params;
  const workflow = getWorkflow(id);
  if (!workflow) notFound();

  const yamlSource = toYaml(workflow);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/workflows"
              className="text-xs text-white/40 hover:text-white/70 font-mono transition-colors"
            >
              &larr; workflows
            </Link>
            <div className="flex gap-4 text-xs font-mono">
              <Link href="/flow" className="text-white/40 hover:text-white/70 transition-colors">
                /flow
              </Link>
              <Link href="/explore" className="text-white/40 hover:text-white/70 transition-colors">
                /explore
              </Link>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-mono tracking-tight">
            {workflow.name}
          </h1>
          <p className="mt-3 text-base md:text-lg text-white/60 font-mono">
            {workflow.description}
          </p>
        </header>

        <WorkflowRunner workflow={workflow} yamlSource={yamlSource} />

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40 font-mono">
          <p>
            Steps resolved against the{' '}
            <a
              href="https://bankr.bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors underline"
            >
              bankr x402 marketplace
            </a>
            . Dry-run only — no live payments are made.
          </p>
        </footer>
      </div>
    </main>
  );
}
