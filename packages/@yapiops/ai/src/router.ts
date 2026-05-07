import type { AiModel } from '@yapiops/db';

export type AITaskType =
  | 'classification'
  | 'simple_extraction'
  | 'short_summary'
  | 'tbdy_madde_yorumu'
  | 'peer_review'
  | 'rapor_anlati'
  | 'hata_analizi'
  | 'multi_step_workflow';

export interface AITask {
  type: AITaskType;
  /** Estimated input token count — used for cost projection. */
  estimatedTokens?: number;
}

/**
 * Picks a Claude model based on task type. Mirrors CLAUDE.md §8.1.
 *
 * Cheap path (Haiku 4.5): classification, extraction, short summaries.
 * Expensive path (Opus 4.7): TBDY interpretation, peer review, narrative,
 * error analysis.
 * Managed Agent: multi-step workflows (live April 2026).
 */
export function selectModel(task: AITask): AiModel {
  switch (task.type) {
    case 'classification':
    case 'simple_extraction':
    case 'short_summary':
      return 'claude-haiku-4-5';

    case 'tbdy_madde_yorumu':
    case 'peer_review':
    case 'rapor_anlati':
    case 'hata_analizi':
      return 'claude-opus-4-7';

    case 'multi_step_workflow':
      return 'claude-managed-agent';
  }
}

/** Resolves the runtime model ID from env (overridable). */
export function resolveModelId(model: AiModel): string {
  switch (model) {
    case 'claude-opus-4-7':
      return process.env.CLAUDE_MODEL_OPUS ?? 'claude-opus-4-7';
    case 'claude-haiku-4-5':
      return process.env.CLAUDE_MODEL_HAIKU ?? 'claude-haiku-4-5-20251001';
    case 'claude-managed-agent':
      return process.env.CLAUDE_MODEL_AGENT ?? 'claude-managed-agent';
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown AiModel: ${String(_exhaustive)}`);
    }
  }
}
