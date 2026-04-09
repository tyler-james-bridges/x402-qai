import type {
  RuleResult,
  ScoreBreakdown,
  CategoryScore,
  ScoreCategory,
  HttpResponse,
  DiscoveryPayload,
  PaymentFlowResult,
} from '../types.js';
import { discoveryRules } from './discovery.js';
import { pricingRules } from './pricing.js';
import { schemeRules } from './scheme.js';
import { errorRules } from './errors.js';
import { paymentRules } from './payment.js';
import { headerRules } from './headers.js';
import { facilitatorRules } from './facilitator.js';
import { timingRules } from './timing.js';

export interface ScanContext {
  url: string;
  response: HttpResponse;
  discovery: DiscoveryPayload | null;
  bodyJson: unknown;
  paymentFlow?: PaymentFlowResult;
  facilitatorReachable?: { ok: boolean; status: number; error?: string };
}

export interface Rule {
  id: string;
  title: string;
  severity: 'error' | 'warn' | 'info';
  category: ScoreCategory;
  check(context: ScanContext): RuleResult;
}

const CATEGORY_WEIGHTS: Record<ScoreCategory, number> = {
  discovery: 0.3,
  headers: 0.25,
  paymentFlow: 0.25,
  errorHandling: 0.2,
};

export function runRules(context: ScanContext, rules: Rule[]): RuleResult[] {
  return rules.map((rule) => rule.check(context));
}

export function calculateScore(results: RuleResult[]): ScoreBreakdown {
  const grouped = new Map<ScoreCategory, RuleResult[]>();

  for (const r of results) {
    const category = categoryFromId(r.id);
    const existing = grouped.get(category) ?? [];
    existing.push(r);
    grouped.set(category, existing);
  }

  const categories: CategoryScore[] = [];
  let total = 0;

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const cat = category as ScoreCategory;
    const catResults = grouped.get(cat) ?? [];
    const maxScore = catResults.length;
    const passed = catResults.filter((r) => r.passed).length;
    const ratio = maxScore > 0 ? passed / maxScore : 1;
    const weighted = Math.round(ratio * weight * 100);

    categories.push({ category: cat, score: weighted, maxScore: Math.round(weight * 100) });
    total += weighted;
  }

  return { total, categories };
}

export function getAllRules(): Rule[] {
  return [
    ...discoveryRules,
    ...pricingRules,
    ...schemeRules,
    ...errorRules,
    ...paymentRules,
    ...headerRules,
    ...facilitatorRules,
    ...timingRules,
  ];
}

function categoryFromId(id: string): ScoreCategory {
  const prefix = id.split('.')[0];
  switch (prefix) {
    case 'discovery':
    case 'timing':
      return 'discovery';
    case 'pricing':
    case 'scheme':
    case 'headers':
      return 'headers';
    case 'flow':
    case 'facilitator':
      return 'paymentFlow';
    case 'errors':
      return 'errorHandling';
    default:
      return 'discovery';
  }
}
