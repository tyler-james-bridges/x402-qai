import { NextRequest, NextResponse } from 'next/server';
import { estimateWorkflow, normalizeWorkflow, parseYamlWorkflow } from '@/lib/workflows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      workflow?: unknown;
      yaml?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: 'Body must be JSON: { workflow } or { yaml }' },
        { status: 400 },
      );
    }

    let workflow;
    if (typeof body.yaml === 'string' && body.yaml.trim()) {
      try {
        workflow = parseYamlWorkflow(body.yaml);
      } catch (err) {
        return NextResponse.json(
          {
            error: err instanceof Error ? err.message : 'Invalid YAML workflow',
          },
          { status: 400 },
        );
      }
    } else if (body.workflow && typeof body.workflow === 'object') {
      try {
        workflow = normalizeWorkflow(body.workflow as Record<string, unknown>);
      } catch (err) {
        return NextResponse.json(
          {
            error: err instanceof Error ? err.message : 'Invalid workflow object',
          },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Provide either a `workflow` object or a `yaml` string' },
        { status: 400 },
      );
    }

    const result = await estimateWorkflow(workflow);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Estimate failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
