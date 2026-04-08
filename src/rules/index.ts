export { type Rule, type ScanContext, runRules, calculateScore, getAllRules } from './engine.js';
export { discoveryRules } from './discovery.js';
export { pricingRules } from './pricing.js';
export { schemeRules } from './scheme.js';
export { errorRules } from './errors.js';

import type { Rule } from './engine.js';
import { discoveryRules } from './discovery.js';
import { pricingRules } from './pricing.js';
import { schemeRules } from './scheme.js';
import { errorRules } from './errors.js';

export const allRules: Rule[] = [...discoveryRules, ...pricingRules, ...schemeRules, ...errorRules];
