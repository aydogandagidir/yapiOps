import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | null = null;

/**
 * Returns the Anthropic SDK client (singleton). Reads `ANTHROPIC_API_KEY`
 * from the environment.
 *
 * Phase 0: thin wrapper only — actual model calls land in Phase 3 with
 * TBDY-Copilot.
 */
export function getAnthropicClient(): Anthropic {
  if (cached) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable.');
  }

  cached = new Anthropic({ apiKey });
  return cached;
}

export function __resetAnthropicClientForTests(): void {
  cached = null;
}
