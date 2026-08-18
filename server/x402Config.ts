/**
 * x402 payment middleware configuration.
 * Separated so the main app module doesn't import x402 at the top level.
 */
import type { RoutesConfig } from '@x402/core/server';
import {
  BUILDER_CODE,
  declareBuilderCodeExtension,
} from '@x402/extensions/builder-code';

const BASE_BUILDER_CODE = 'bc_jhxtiha3';
const BUILDER_CODE_EXTENSION = {
  [BUILDER_CODE]: declareBuilderCodeExtension(BASE_BUILDER_CODE),
};

export function buildRoutes(sellerAddress: `0x${string}`): RoutesConfig {
  return {
    'POST /api/v1/audit': {
      accepts: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: sellerAddress,
        price: {
          asset: 'USDC',
          amount: '0.05',
        },
      },
      description: 'x402 compliance audit — 10 rule categories, scored 0-100',
      extensions: BUILDER_CODE_EXTENSION,
    },
    'POST /api/v1/audit/full': {
      accepts: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: sellerAddress,
        price: {
          asset: 'USDC',
          amount: '0.10',
        },
      },
      description: 'Full audit with live payment flow verification',
      extensions: BUILDER_CODE_EXTENSION,
    },
  };
}
