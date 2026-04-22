import yaml from 'js-yaml';

export type WorkflowMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface WorkflowStep {
  id: string;
  name: string;
  endpoint: string;
  method: WorkflowMethod;
  input?: Record<string, unknown>;
  description?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger?: Record<string, unknown>;
  steps: WorkflowStep[];
}

export interface ResolvedRoute {
  price: string;
  currency: string;
  network: string;
  description?: string;
  schema?: Record<string, unknown>;
  methods: string[];
}

export interface ResolvedStep extends WorkflowStep {
  resolved: boolean;
  price: number;
  currency: string;
  network: string;
  routeDescription?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  error?: string;
}

export interface EstimateResult {
  steps: ResolvedStep[];
  totalCost: number;
  currency: string;
  unresolvedCount: number;
}

const EXAMPLE_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'research-summarize',
    name: 'Research & Summarize',
    description: 'Deep web research on a topic, then condense findings into a concise brief.',
    trigger: { query: 'impact of stablecoins on emerging markets' },
    steps: [
      {
        id: 'research',
        name: 'Web Research',
        endpoint: 'https://x402.bankr.bot/0x24908846a4397d3549d07661e0fc02220ab14dad/research',
        method: 'POST',
        input: {
          query: '{{trigger.query}}',
          depth: 'standard',
        },
        description: 'Structured research brief with sources.',
      },
      {
        id: 'summarize',
        name: 'Summarize Findings',
        endpoint: 'https://x402.bankr.bot/0x79bb6eac4afef0d0552a7fc7ec80f0b46fa89884/summarize',
        method: 'POST',
        input: {
          text: '{{steps.research.output.summary}}',
          style: 'executive-brief',
        },
        description: 'Condense research into an executive summary.',
      },
    ],
  },
  {
    id: 'multi-llm-compare',
    name: 'Multi-LLM Compare',
    description: 'Send the same prompt to three LLM endpoints and compare their answers.',
    trigger: { prompt: 'Explain the x402 payment protocol in two sentences.' },
    steps: [
      {
        id: 'model_a',
        name: 'LITCOIN Chat',
        endpoint: 'https://x402.bankr.bot/0xcea8f39419541e6ac9efbdd37b60657b4093ef08/chat',
        method: 'POST',
        input: {
          messages: [{ role: 'user', content: '{{trigger.prompt}}' }],
        },
      },
      {
        id: 'model_b',
        name: 'LITCOIN Compute',
        endpoint: 'https://x402.bankr.bot/0xcea8f39419541e6ac9efbdd37b60657b4093ef08/compute',
        method: 'POST',
        input: {
          prompt: '{{trigger.prompt}}',
        },
      },
      {
        id: 'model_c',
        name: 'Nyor Ask',
        endpoint: 'https://x402.bankr.bot/0x7eb9d61d5e09e15c36172549d20791617d21e49b/ask',
        method: 'POST',
        input: {
          question: '{{trigger.prompt}}',
        },
      },
    ],
  },
  {
    id: 'trading-decision-chain',
    name: 'Trading Decision Chain',
    description:
      'Fetch live signals, score edge, size the position, then run a portfolio risk check.',
    trigger: { portfolio_size_usd: 10000 },
    steps: [
      {
        id: 'signals',
        name: 'Fetch Signals',
        endpoint: 'https://x402.bankr.bot/0xf264164304aca141fdea59de6f8171714ad333d4/signals',
        method: 'GET',
      },
      {
        id: 'edge',
        name: 'Edge Scorer',
        endpoint: 'https://x402.bankr.bot/0x538aa4800ae2bd8e90556899514376ab96113a8e/edge-scorer',
        method: 'POST',
        input: {
          signal: '{{steps.signals.output.top}}',
        },
      },
      {
        id: 'size',
        name: 'Kelly Sizer',
        endpoint: 'https://x402.bankr.bot/0x538aa4800ae2bd8e90556899514376ab96113a8e/kelly-sizer',
        method: 'POST',
        input: {
          edge: '{{steps.edge.output.score}}',
          bankroll: '{{trigger.portfolio_size_usd}}',
        },
      },
      {
        id: 'risk',
        name: 'Risk Check',
        endpoint: 'https://x402.bankr.bot/0x538aa4800ae2bd8e90556899514376ab96113a8e/risk-check',
        method: 'POST',
        input: {
          size: '{{steps.size.output.stake}}',
          portfolio: '{{trigger.portfolio_size_usd}}',
        },
      },
    ],
  },
  {
    id: 'research-to-art',
    name: 'Research to Art',
    description: 'Research a topic, then turn the key findings into a generative art piece.',
    trigger: { topic: 'black holes and time dilation' },
    steps: [
      {
        id: 'research',
        name: 'Research Topic',
        endpoint: 'https://x402.bankr.bot/0x24908846a4397d3549d07661e0fc02220ab14dad/research',
        method: 'POST',
        input: {
          query: '{{trigger.topic}}',
          depth: 'quick',
        },
      },
      {
        id: 'art',
        name: 'Generative Art',
        endpoint: 'https://x402.bankr.bot/0x8f9ec800972258e48d7ebc2640ea0b5e245c2cf5/thryx-art',
        method: 'POST',
        input: {
          seed: '{{steps.research.output.topic}}',
          style: 'particle-galaxy',
        },
      },
    ],
  },
  {
    id: 'market-scan',
    name: 'Market Scan Agent',
    description: 'Pull trending Base tokens, enrich with vault context, then score the top edge.',
    trigger: { limit: 10 },
    steps: [
      {
        id: 'trending',
        name: 'Trending Base Coins',
        endpoint:
          'https://x402.bankr.bot/0xf47535adb19c8905f9384e423063708651ac2805/trending-base-coins',
        method: 'GET',
      },
      {
        id: 'context',
        name: 'Vault Context',
        endpoint: 'https://x402.bankr.bot/0xf264164304aca141fdea59de6f8171714ad333d4/vault-context',
        method: 'GET',
      },
      {
        id: 'edge',
        name: 'Edge Scorer',
        endpoint: 'https://x402.bankr.bot/0x538aa4800ae2bd8e90556899514376ab96113a8e/edge-scorer',
        method: 'POST',
        input: {
          candidates: '{{steps.trending.output.coins}}',
          context: '{{steps.context.output}}',
        },
      },
    ],
  },
];

export function listWorkflows(): WorkflowDefinition[] {
  return EXAMPLE_WORKFLOWS;
}

export function getWorkflow(id: string): WorkflowDefinition | null {
  return EXAMPLE_WORKFLOWS.find((w) => w.id === id) ?? null;
}

export function parseYamlWorkflow(text: string): WorkflowDefinition {
  const parsed = yaml.load(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Workflow must be a YAML mapping');
  }
  return normalizeWorkflow(parsed as Record<string, unknown>);
}

export function normalizeWorkflow(raw: Record<string, unknown>): WorkflowDefinition {
  const name = typeof raw.name === 'string' ? raw.name : 'Untitled Workflow';
  const description = typeof raw.description === 'string' ? raw.description : '';
  const id = typeof raw.id === 'string' ? raw.id : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const steps: WorkflowStep[] = rawSteps.map((s, idx) => {
    if (!s || typeof s !== 'object') {
      throw new Error(`Step ${idx} is not an object`);
    }
    const step = s as Record<string, unknown>;
    const stepId = typeof step.id === 'string' ? step.id : `step_${idx}`;
    const stepName = typeof step.name === 'string' ? step.name : `Step ${idx + 1}`;
    const endpoint = typeof step.endpoint === 'string' ? step.endpoint : '';
    if (!endpoint) {
      throw new Error(`Step "${stepId}" missing endpoint`);
    }
    const method = (
      typeof step.method === 'string' ? step.method.toUpperCase() : 'POST'
    ) as WorkflowMethod;
    const input =
      step.input && typeof step.input === 'object'
        ? (step.input as Record<string, unknown>)
        : undefined;
    const description = typeof step.description === 'string' ? step.description : undefined;
    return {
      id: stepId,
      name: stepName,
      endpoint,
      method,
      input,
      description,
    };
  });

  const trigger =
    raw.trigger && typeof raw.trigger === 'object'
      ? (raw.trigger as Record<string, unknown>)
      : undefined;

  return { id, name, description, trigger, steps };
}

const BANKR_API = 'https://api.bankr.bot';

interface BankrService {
  slug: string;
  name: string;
  url: string;
  description?: string;
  routes?: Array<{
    path?: string;
    methods?: string[];
    price?: string;
    currency?: string;
    network?: string;
    description?: string;
    schema?: {
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
    };
  }>;
}

function extractSlugFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!path) return null;
    return path;
  } catch {
    return null;
  }
}

async function lookupBankrService(url: string, signal?: AbortSignal): Promise<BankrService | null> {
  const slug = extractSlugFromUrl(url);
  if (!slug) return null;
  const shortName = slug.split('/').pop() ?? slug;
  try {
    const params = new URLSearchParams({ q: shortName, limit: '50' });
    const res = await fetch(`${BANKR_API}/x402/endpoints/discover?${params}`, {
      signal: signal ?? AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      services?: BankrService[];
    };
    if (!Array.isArray(data.services)) return null;
    return data.services.find((s) => s.slug === slug || s.url === url) ?? null;
  } catch {
    return null;
  }
}

export async function resolveStep(step: WorkflowStep, signal?: AbortSignal): Promise<ResolvedStep> {
  const service = await lookupBankrService(step.endpoint, signal);
  if (!service) {
    return {
      ...step,
      resolved: false,
      price: 0,
      currency: 'USDC',
      network: 'base',
      error: 'Endpoint not found in Bankr marketplace',
    };
  }
  const route =
    service.routes?.find((r) => r.methods?.some((m) => m.toUpperCase() === step.method)) ??
    service.routes?.[0];
  const priceStr = route?.price ?? '0';
  const price = Number(priceStr);
  return {
    ...step,
    resolved: true,
    price: Number.isFinite(price) ? price : 0,
    currency: route?.currency ?? 'USDC',
    network: route?.network ?? 'base',
    routeDescription: route?.description ?? service.description,
    inputSchema: route?.schema?.input,
    outputSchema: route?.schema?.output,
  };
}

export async function estimateWorkflow(
  workflow: WorkflowDefinition,
  signal?: AbortSignal,
): Promise<EstimateResult> {
  const steps = await Promise.all(workflow.steps.map((s) => resolveStep(s, signal)));
  const currency = steps.find((s) => s.resolved)?.currency ?? 'USDC';
  const totalCost = steps.reduce((sum, s) => sum + s.price, 0);
  const unresolvedCount = steps.filter((s) => !s.resolved).length;
  return { steps, totalCost, currency, unresolvedCount };
}

export function toYaml(workflow: WorkflowDefinition): string {
  return yaml.dump(
    {
      name: workflow.name,
      description: workflow.description,
      trigger: workflow.trigger ?? {},
      steps: workflow.steps.map((s) => ({
        id: s.id,
        name: s.name,
        endpoint: s.endpoint,
        method: s.method,
        ...(s.input ? { input: s.input } : {}),
      })),
    },
    { lineWidth: 120 },
  );
}
