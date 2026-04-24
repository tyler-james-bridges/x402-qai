/**
 * x402 payment middleware configuration.
 * Separated so the main app module doesn't import x402 at the top level.
 */
import type { RoutesConfig } from '@x402/core/server';

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
    },
  };
}
