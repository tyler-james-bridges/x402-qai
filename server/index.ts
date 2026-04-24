import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT ?? 3402);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`x402-qai server listening on http://localhost:${info.port}`);
  if (!process.env.SELLER_WALLET_ADDRESS) {
    console.log('⚠️  SELLER_WALLET_ADDRESS not set — payment gating DISABLED (dev mode)');
  }
});
