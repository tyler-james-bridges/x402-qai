export { type Rule, type ScanContext, runRules, calculateScore, getAllRules } from './engine.js';
export { discoveryRules } from './discovery.js';
export { pricingRules } from './pricing.js';
export { schemeRules } from './scheme.js';
export { errorRules } from './errors.js';
export { paymentRules } from './payment.js';
export { headerRules } from './headers.js';
export { facilitatorRules } from './facilitator.js';
export { timingRules } from './timing.js';

import type { Rule } from './engine.js';
import { discoveryRules } from './discovery.js';
import { pricingRules } from './pricing.js';
import { schemeRules } from './scheme.js';
import { errorRules } from './errors.js';
import { paymentRules } from './payment.js';
import { headerRules } from './headers.js';
import { facilitatorRules } from './facilitator.js';
import { timingRules } from './timing.js';

export const allRules: Rule[] = [
  ...discoveryRules,
  ...pricingRules,
  ...schemeRules,
  ...errorRules,
  ...paymentRules,
  ...headerRules,
  ...facilitatorRules,
  ...timingRules,
];
