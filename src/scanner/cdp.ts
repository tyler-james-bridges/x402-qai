import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DiscoveryPayload } from '../types.js';

const execFileAsync = promisify(execFile);

export interface CdpSupported {
  schemes: string[];
  networks: string[];
}

export interface CdpCompatibilityResult {
  compatible: boolean;
  issues: string[];
}

export async function checkCdpAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('cdp', ['env'], { timeout: 5000 });
    // If cdp env returns output with a configured key, it's available
    return stdout.length > 0;
  } catch {
    return false;
  }
}

export async function getCdpSupported(): Promise<CdpSupported> {
  try {
    const { stdout } = await execFileAsync('cdp', ['api', '-X', 'GET', '/x402/supported'], {
      timeout: 10000,
    });
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    return {
      schemes: Array.isArray(parsed['schemes']) ? (parsed['schemes'] as string[]) : [],
      networks: Array.isArray(parsed['networks']) ? (parsed['networks'] as string[]) : [],
    };
  } catch {
    return { schemes: [], networks: [] };
  }
}

export function checkCdpCompatibility(
  discovery: DiscoveryPayload,
  supported: CdpSupported,
): CdpCompatibilityResult {
  const issues: string[] = [];

  if (supported.schemes.length > 0 && !supported.schemes.includes(discovery.scheme)) {
    issues.push(
      `Scheme "${discovery.scheme}" not supported by CDP facilitator. Supported: ${supported.schemes.join(', ')}`,
    );
  }

  if (supported.networks.length > 0 && !supported.networks.includes(discovery.network)) {
    issues.push(
      `Network "${discovery.network}" not supported by CDP facilitator. Supported: ${supported.networks.join(', ')}`,
    );
  }

  return {
    compatible: issues.length === 0,
    issues,
  };
}
