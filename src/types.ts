import { z } from 'zod/v4';

// -- Severity & Rule Results --

export type Severity = 'error' | 'warn' | 'info';

export interface RuleResult {
  id: string;
  title: string;
  severity: Severity;
  passed: boolean;
  message: string;
  suggestion?: string;
}

// -- Discovery Payload --

export const DiscoveryPayloadSchema = z.object({
  x402Version: z.number().int().positive(),
  scheme: z.string().min(1),
  network: z.string().min(1),
  asset: z.string().min(1),
  amount: z.string().min(1),
  payTo: z.string().min(1),
  maxTimeoutSeconds: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  description: z.string().optional(),
  resource: z.string().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type DiscoveryPayload = z.infer<typeof DiscoveryPayloadSchema>;

// -- Score --

export type ScoreCategory = 'discovery' | 'headers' | 'paymentFlow' | 'errorHandling';

export interface CategoryScore {
  category: ScoreCategory;
  score: number;
  maxScore: number;
}

export interface ScoreBreakdown {
  total: number;
  categories: CategoryScore[];
}

// -- Scan Options & Results --

export type ReportFormat = 'text' | 'json';

export interface ScanOptions {
  pay: boolean;
  maxAmount?: string;
  timeout: number;
  format: ReportFormat;
  threshold?: number;
}

export interface PaymentFlowResult {
  attempted: boolean;
  passed: boolean;
  skipped: boolean;
  reason?: string;
  details?: Record<string, unknown>;
  errors: string[];
}

export interface ScanResult {
  url: string;
  timestamp: string;
  passed: boolean;
  score: ScoreBreakdown;
  rules: RuleResult[];
  discovery: DiscoveryPayload | null;
  paymentFlow?: PaymentFlowResult;
  errors: string[];
}

// -- HTTP helpers --

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}
