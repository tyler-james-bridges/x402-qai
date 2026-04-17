import { NextResponse } from 'next/server';
import { getReport } from '@/lib/report-store';

export async function GET(_req: Request, ctx: RouteContext<'/api/report/[hash]'>) {
  const { hash } = await ctx.params;
  const record = getReport(hash);
  if (!record) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  return NextResponse.json(record);
}
