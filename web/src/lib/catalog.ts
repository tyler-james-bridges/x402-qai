export interface CatalogEntry {
  slug: string;
  name: string;
  description: string;
  url: string;
  homepage?: string;
  category: string;
  network: string;
  priceUsd?: number;
  asset?: string;
  scheme?: string;
  payTo?: string;
  scoreGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreValue?: number;
  lastScannedAt?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  example?: { request?: Record<string, unknown>; response?: Record<string, unknown> };
  tags?: string[];
}

export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  example?: unknown;
}

// Seed catalog. In production these are refreshed by a crawler that reads the 402
// discovery payload and runs a scan. Entries without priceUsd/scheme/payTo are
// placeholders populated on first successful scan.
export const SEED_CATALOG: CatalogEntry[] = [
  {
    slug: 'stableenrich',
    name: 'stableenrich.dev',
    description:
      'Enrichment API for contact, company, and crypto-wallet data. Pay-per-lookup via x402.',
    url: 'https://stableenrich.dev/',
    homepage: 'https://stableenrich.dev/',
    category: 'data',
    network: 'base',
    tags: ['enrichment', 'crm'],
  },
  {
    slug: 'stablesocial',
    name: 'stablesocial.dev',
    description:
      'Social-graph lookups (followers, posts, engagement) priced per call with x402.',
    url: 'https://stablesocial.dev/',
    homepage: 'https://stablesocial.dev/',
    category: 'data',
    network: 'base',
    tags: ['social'],
  },
  {
    slug: 'stableemail',
    name: 'stableemail.dev',
    description:
      'Pay-per-send transactional email API with x402-native metering.',
    url: 'https://stableemail.dev/',
    homepage: 'https://stableemail.dev/',
    category: 'infra',
    network: 'base',
    tags: ['email'],
  },
  {
    slug: 'stableupload',
    name: 'stableupload.dev',
    description:
      'Pay-per-byte upload / storage endpoint gated by x402. Upload files, pay once, get a URL.',
    url: 'https://stableupload.dev/',
    homepage: 'https://stableupload.dev/',
    category: 'infra',
    network: 'base',
    tags: ['storage', 'upload'],
  },
  {
    slug: 'stabletravel',
    name: 'stabletravel.dev',
    description:
      'Travel search and booking primitives (flights, stays) with per-query x402 pricing.',
    url: 'https://stabletravel.dev/',
    homepage: 'https://stabletravel.dev/',
    category: 'data',
    network: 'base',
    tags: ['travel'],
  },
  {
    slug: 'afkonchain',
    name: 'afkonchain.xyz',
    description:
      'Community-maintained index of x402 services. Use /flow on any URL here to visualize its handshake.',
    url: 'https://afkonchain.xyz/explore',
    homepage: 'https://afkonchain.xyz/',
    category: 'directory',
    network: 'base',
    tags: ['directory', 'index'],
  },
  {
    slug: 'bankr-llm-completion',
    name: 'bankr / llm-completion',
    description:
      'Pay-per-token LLM completion endpoint. Returns a plain text completion for the supplied prompt.',
    url: 'https://example.com/bankr/llm-completion',
    category: 'ai',
    network: 'base',
    priceUsd: 0.01,
    asset: 'USDC',
    scheme: 'exact',
    payTo: '0x1111111111111111111111111111111111111111',
    scoreGrade: 'A',
    scoreValue: 96,
    lastScannedAt: '2026-04-16T10:00:00.000Z',
    inputSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'The user prompt to complete.' },
        max_tokens: { type: 'integer', description: 'Maximum tokens to emit.', example: 512 },
        temperature: { type: 'number', description: 'Sampling temperature 0-1.', example: 0.7 },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        completion: { type: 'string', description: 'Model output.' },
        usage: {
          type: 'object',
          properties: {
            input_tokens: { type: 'integer' },
            output_tokens: { type: 'integer' },
          },
        },
      },
    },
    example: {
      request: { prompt: 'write a haiku about x402', max_tokens: 128 },
      response: {
        completion: 'protocol awakens / every endpoint a small coin / bandwidth turns to cash',
        usage: { input_tokens: 10, output_tokens: 25 },
      },
    },
    tags: ['llm', 'ai'],
  },
  {
    slug: 'onchain-price-oracle',
    name: 'onchain / price-oracle',
    description: 'Real-time USD price for any ERC-20 token on Base. $0.005 per query.',
    url: 'https://example.com/onchain/price-oracle',
    category: 'data',
    network: 'base',
    priceUsd: 0.005,
    asset: 'USDC',
    scheme: 'exact',
    payTo: '0x3333333333333333333333333333333333333333',
    scoreGrade: 'A',
    scoreValue: 92,
    lastScannedAt: '2026-04-16T08:30:00.000Z',
    inputSchema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', description: 'ERC-20 contract address (Base).' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        priceUsd: { type: 'number' },
        updatedAt: { type: 'string' },
      },
    },
  },
];

export interface CatalogFilters {
  q?: string;
  category?: string;
  network?: string;
  maxPrice?: number;
  minGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  sort?: 'newest' | 'cheapest' | 'highest-rated';
}

const GRADE_ORDER: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };

export function filterCatalog(entries: CatalogEntry[], filters: CatalogFilters): CatalogEntry[] {
  let out = entries.slice();

  if (filters.q) {
    const q = filters.q.toLowerCase();
    out = out.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }
  if (filters.category) {
    out = out.filter((e) => e.category === filters.category);
  }
  if (filters.network) {
    out = out.filter((e) => e.network === filters.network);
  }
  if (typeof filters.maxPrice === 'number') {
    out = out.filter((e) => (e.priceUsd ?? Infinity) <= (filters.maxPrice as number));
  }
  if (filters.minGrade) {
    const min = GRADE_ORDER[filters.minGrade];
    out = out.filter((e) => e.scoreGrade && GRADE_ORDER[e.scoreGrade] >= min);
  }

  switch (filters.sort) {
    case 'cheapest':
      out.sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity));
      break;
    case 'highest-rated':
      out.sort((a, b) => (b.scoreValue ?? 0) - (a.scoreValue ?? 0));
      break;
    case 'newest':
    default:
      out.sort((a, b) => (b.lastScannedAt ?? '').localeCompare(a.lastScannedAt ?? ''));
      break;
  }

  return out;
}

export function findEntry(slug: string): CatalogEntry | undefined {
  return SEED_CATALOG.find((e) => e.slug === slug);
}

export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
