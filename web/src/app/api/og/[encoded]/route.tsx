import { ImageResponse } from 'next/og';
import { scan } from 'x402-qai';
import {
  scoreToGrade,
  gradeColor,
  categoryLabel,
  safeDecodeUrl,
  type ScanResult,
} from '@/lib/grade';

export const revalidate = 300;

const SIZE = { width: 1200, height: 630 } as const;

interface RouteParams {
  params: Promise<{ encoded: string }>;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '...';
}

async function runScan(url: string): Promise<ScanResult | null> {
  try {
    const result = await scan(url, { pay: false, timeout: 15000, format: 'json' });
    return result as ScanResult;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, ctx: RouteParams) {
  const { encoded } = await ctx.params;
  const url = safeDecodeUrl(encoded);

  if (!url) {
    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          fontSize: 48,
          fontFamily: 'monospace',
        }}
      >
        Invalid URL
      </div>,
      SIZE,
    );
  }

  const result = await runScan(url);

  if (!result) {
    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          fontFamily: 'monospace',
          padding: 60,
        }}
      >
        <div style={{ fontSize: 36, color: '#ef4444', marginBottom: 24 }}>Scan unavailable</div>
        <div
          style={{
            fontSize: 24,
            color: '#888',
            textAlign: 'center',
            maxWidth: 1000,
            wordBreak: 'break-all',
          }}
        >
          {truncate(url, 120)}
        </div>
      </div>,
      SIZE,
    );
  }

  const grade = scoreToGrade(result.score.total);
  const color = gradeColor(grade);
  const displayUrl = truncate(url, 90);

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#000',
        color: '#fff',
        fontFamily: 'monospace',
        padding: 60,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#fff' }}>
            x402-qai
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: '#666' }}>compliance report</div>
        </div>
        <div style={{ display: 'flex', fontSize: 16, color: '#666' }}>qai.0x402.sh</div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: 22,
          color: '#888',
          wordBreak: 'break-all',
          marginBottom: 30,
        }}
      >
        {displayUrl}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 50,
          marginBottom: 50,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 220,
            height: 220,
            borderRadius: 32,
            border: `8px solid ${color}`,
            color,
            fontSize: 160,
            fontWeight: 800,
          }}
        >
          {grade}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color, lineHeight: 1 }}>
              {result.score.total}
            </div>
            <div style={{ display: 'flex', fontSize: 36, color: '#666' }}>/100</div>
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 12,
              fontSize: 24,
              color: result.passed ? '#22c55e' : '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            {result.passed ? 'pass' : 'fail'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {result.score.categories.map((cat) => {
          const pct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
          const barColor = pct === 100 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
          return (
            <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 18,
                }}
              >
                <div style={{ display: 'flex', color: '#ccc' }}>{categoryLabel(cat.category)}</div>
                <div style={{ display: 'flex', color: '#888' }}>
                  {`${cat.score}/${cat.maxScore}`}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: 10,
                  background: '#1a1a1a',
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    SIZE,
  );
}
