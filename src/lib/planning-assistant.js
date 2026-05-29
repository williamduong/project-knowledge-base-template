'use strict';

const { z } = require('zod');

const { readAiSettings } = require('./ai-settings');
const { createProvider } = require('../llm');

const DEFAULT_SYSTEM_PROMPT =
  'You are the planning copilot for this control plane. Stay grounded in the current workspace state, prefer clarity over verbosity, and never invent IDs, releases, key results, or progress.';
const DEFAULT_HARNESS_PROMPT =
  'Summarize the current state, identify the most important planning gap, and recommend the smallest useful next action tied to a key result or release.';

const RecommendationSchema = z.object({
  decision: z.enum(['bind-existing', 'propose-new-okr', 'out-of-scope']),
  summary: z.string().min(1),
  why_now: z.string().min(1),
  next_action: z.string().min(1),
  primary_key_result_id: z.string().nullable().default(null),
  primary_release_id: z.string().nullable().default(null),
  proposed_objective: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    success_criteria: z.string().min(1),
  }).nullable().default(null),
  proposed_key_result: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    success_criteria: z.string().min(1),
    metric: z.string().min(1),
    target: z.string().min(1),
  }).nullable().default(null),
  out_of_scope_reason: z.string().nullable().default(null),
  key_result_candidates: z.array(z.object({
    id: z.string().min(1),
    rationale: z.string().min(1),
    confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  })).max(3).default([]),
  release_candidates: z.array(z.object({
    id: z.string().min(1),
    rationale: z.string().min(1),
    confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  })).max(3).default([]),
  warnings: z.array(z.string()).max(6).default([]),
});

const RecommendationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'decision',
    'summary',
    'why_now',
    'next_action',
    'primary_key_result_id',
    'primary_release_id',
    'proposed_objective',
    'proposed_key_result',
    'out_of_scope_reason',
    'key_result_candidates',
    'release_candidates',
    'warnings',
  ],
  properties: {
    decision: { type: 'string', enum: ['bind-existing', 'propose-new-okr', 'out-of-scope'] },
    summary: { type: 'string' },
    why_now: { type: 'string' },
    next_action: { type: 'string' },
    primary_key_result_id: { type: ['string', 'null'] },
    primary_release_id: { type: ['string', 'null'] },
    proposed_objective: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['title', 'description', 'success_criteria'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        success_criteria: { type: 'string' },
      },
    },
    proposed_key_result: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['title', 'description', 'success_criteria', 'metric', 'target'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        success_criteria: { type: 'string' },
        metric: { type: 'string' },
        target: { type: 'string' },
      },
    },
    out_of_scope_reason: { type: ['string', 'null'] },
    key_result_candidates: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'rationale', 'confidence'],
        properties: {
          id: { type: 'string' },
          rationale: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    release_candidates: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'rationale', 'confidence'],
        properties: {
          id: { type: 'string' },
          rationale: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    warnings: {
      type: 'array',
      maxItems: 6,
      items: { type: 'string' },
    },
  },
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function overlapScore(sourceText, candidateText) {
  const sourceTokens = new Set(tokenize(sourceText));
  const candidateTokens = new Set(tokenize(candidateText));
  if (!sourceTokens.size || !candidateTokens.size) {
    return 0;
  }

  let score = 0;
  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) {
      score += token.length > 7 ? 2 : 1;
    }
  }
  return score;
}

function buildIntentReleaseMembership(workspace) {
  const releaseMap = new Map();
  for (const release of workspace.releases || []) {
    for (const intent of release.intents || []) {
      if (!releaseMap.has(intent.id)) {
        releaseMap.set(intent.id, []);
      }
      releaseMap.get(intent.id).push(release);
    }
  }
  return releaseMap;
}

function getParentObjectiveMap(workspace) {
  return new Map((workspace.objectives || []).flatMap((objective) => {
    const bucket = [[objective.id, objective]];
    const queue = [...(objective.children || [])];
    while (queue.length) {
      const current = queue.shift();
      bucket.push([current.id, current]);
      queue.push(...(current.children || []));
    }
    return bucket;
  }));
}

function buildIntentSourceText(intent, currentReleases) {
  return [
    intent.id,
    intent.title,
    intent.summary,
    intent.goal_text,
    intent.decision_summary,
    intent.focus_current,
    intent.focus_next_action,
    intent.release_bucket,
    currentReleases.map((release) => `${release.code} ${release.title} ${release.description}`).join(' '),
  ].join(' ');
}

function selectKeyResultCandidates(workspace, intent, { limit = 4 } = {}) {
  const objectiveMap = getParentObjectiveMap(workspace);
  const currentReleaseMembership = buildIntentReleaseMembership(workspace).get(intent.id) || [];
  const intentText = buildIntentSourceText(intent, currentReleaseMembership);

  return (workspace.keyResults || [])
    .filter((keyResult) => !intent.linked_key_result_ids.includes(keyResult.id))
    .map((keyResult) => {
      const objective = objectiveMap.get(keyResult.parent_objective_id) || null;
      const candidateText = [
        keyResult.code,
        keyResult.title,
        keyResult.description,
        keyResult.success_criteria,
        keyResult.metric,
        keyResult.target,
        objective?.code,
        objective?.title,
        objective?.description,
      ].join(' ');
      const score = overlapScore(intentText, candidateText)
        + (objective && overlapScore(intent.release_bucket, `${objective.code} ${objective.title}`) ? 2 : 0)
        + (keyResult.state === 'active' ? 1 : 0);

      return {
        id: keyResult.id,
        code: keyResult.code,
        title: keyResult.title,
        description: keyResult.description,
        state: keyResult.state,
        metric: keyResult.metric,
        target: keyResult.target,
        objective_id: objective?.id || null,
        objective_code: objective?.code || null,
        objective_title: objective?.title || null,
        score,
      };
    })
    .sort((left, right) => right.score - left.score || left.code.localeCompare(right.code))
    .slice(0, limit);
}

function selectReleaseCandidates(workspace, intent, { limit = 4 } = {}) {
  const currentReleaseIds = new Set(
    (buildIntentReleaseMembership(workspace).get(intent.id) || []).map((release) => release.id),
  );
  const intentText = [
    intent.id,
    intent.title,
    intent.summary,
    intent.goal_text,
    intent.focus_current,
    intent.focus_next_action,
    intent.release_bucket,
  ].join(' ');

  return (workspace.releases || [])
    .map((release) => {
      const releaseText = [release.code, release.title, release.description, release.release_bucket].join(' ');
      const score = overlapScore(intentText, releaseText)
        + (release.release_bucket && release.release_bucket === intent.release_bucket ? 3 : 0)
        + (release.state === 'active' ? 2 : 0)
        + (release.source_kind === 'declared' ? 1 : 0);

      return {
        id: release.id,
        code: release.code,
        title: release.title,
        description: release.description,
        state: release.state,
        release_bucket: release.release_bucket,
        source_kind: release.source_kind,
        progress: release.progress,
        already_included: currentReleaseIds.has(release.id),
        score,
      };
    })
    .sort((left, right) => right.score - left.score || left.code.localeCompare(right.code))
    .slice(0, limit);
}

function buildPrompt({ settings, workspace, intent, keyResults, releases }) {
  const currentReleases = buildIntentReleaseMembership(workspace).get(intent.id) || [];
  return [
    'SYSTEM PROMPT',
    settings.system_prompt || DEFAULT_SYSTEM_PROMPT,
    '',
    'PLANNING HARNESS',
    settings.planning_harness_prompt || DEFAULT_HARNESS_PROMPT,
    '',
    'APP PRIMARY GOALS',
    settings.app_primary_goals || 'No explicit app goals configured.',
    '',
    'APP DESCRIPTION',
    settings.app_description || 'No explicit app description configured.',
    '',
    'WORKSPACE SUMMARY',
    JSON.stringify({
      workspace: workspace.workspace,
      northStar: workspace.northStar,
      summary: workspace.summary,
    }, null, 2),
    '',
    'SELECTED INTENT',
    JSON.stringify({
      id: intent.id,
      title: intent.title,
      lifecycle: intent.lifecycle,
      summary: intent.summary,
      goal_text: intent.goal_text,
      decision_summary: intent.decision_summary,
      focus_current: intent.focus_current,
      focus_next_action: intent.focus_next_action,
      release_bucket: intent.release_bucket,
      validation_state: intent.validation_state,
      linked_key_result_ids: intent.linked_key_result_ids,
      current_releases: currentReleases.map((release) => ({
        id: release.id,
        code: release.code,
        title: release.title,
      })),
      tasks: (intent.tasks || []).slice(0, 8).map((task) => ({
        id: task.id,
        title: task.title,
        state: task.state,
        section: task.section,
      })),
    }, null, 2),
    '',
    'KEY RESULT CANDIDATES',
    JSON.stringify(keyResults, null, 2),
    '',
    'RELEASE CANDIDATES',
    JSON.stringify(releases, null, 2),
    '',
    'TASK',
    [
      'Recommend the best key result and release alignment for the selected intent.',
      'Only use candidate IDs that appear in the provided candidate lists.',
      'Prefer the smallest practical move that improves clarity and traceability.',
      'Decide exactly one path: bind-existing, propose-new-okr, or out-of-scope.',
      'If a release change is unnecessary, you may leave primary_release_id as null.',
      'If no strong key result match exists, do not force a weak match.',
      'When decision is propose-new-okr, fill proposed_objective and proposed_key_result.',
      'When decision is out-of-scope, fill out_of_scope_reason.',
      'Return concise operator-facing language.',
    ].join('\n'),
  ].join('\n');
}

function enrichRecommendations(raw, keyResults, releases) {
  const keyResultMap = new Map(keyResults.map((item) => [item.id, item]));
  const releaseMap = new Map(releases.map((item) => [item.id, item]));

  return {
    decision: raw.decision,
    summary: raw.summary,
    why_now: raw.why_now,
    next_action: raw.next_action,
    primary_key_result_id: raw.primary_key_result_id && keyResultMap.has(raw.primary_key_result_id)
      ? raw.primary_key_result_id
      : null,
    primary_release_id: raw.primary_release_id && releaseMap.has(raw.primary_release_id)
      ? raw.primary_release_id
      : null,
    key_result_candidates: raw.key_result_candidates
      .filter((candidate) => keyResultMap.has(candidate.id))
      .map((candidate) => ({
        ...keyResultMap.get(candidate.id),
        rationale: candidate.rationale,
        confidence: candidate.confidence,
      })),
    release_candidates: raw.release_candidates
      .filter((candidate) => releaseMap.has(candidate.id))
      .map((candidate) => ({
        ...releaseMap.get(candidate.id),
        rationale: candidate.rationale,
        confidence: candidate.confidence,
      })),
    proposed_objective: raw.proposed_objective,
    proposed_key_result: raw.proposed_key_result,
    out_of_scope_reason: raw.out_of_scope_reason,
    warnings: raw.warnings,
  };
}

function parseJsonBlock(text) {
  const source = String(text || '').trim();
  const fenced = source.match(/```json\s*([\s\S]*?)```/i) || source.match(/```\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1].trim() : source;
  const firstBrace = payload.indexOf('{');
  const lastBrace = payload.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Assistant response did not contain a JSON object.');
  }
  let json = payload.slice(firstBrace, lastBrace + 1);

  // Repair common LLM JSON formatting errors
  json = repairJson(json);

  return JSON.parse(json);
}

function repairJson(json) {
  // Remove trailing commas before ] or }
  let repaired = json.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between array elements: }\n{ or ]\n[ or }\s*{ or ]\s*[
  // Pattern: } or ] followed by newline/whitespace then { or [ without a comma
  repaired = repaired.replace(/([}\]])\s*\n\s*([{\[])/g, '$1,\n$2');
  repaired = repaired.replace(/([}\]])\s+([{\[])/g, '$1, $2');

  // Fix missing commas between string values in arrays (e.g., "a"\n"b")
  repaired = repaired.replace(/("\s*\n\s*")/g, '",\n"');

  return repaired;
}

async function generateIntentPlanSuggestion(
  workspaceRoot,
  workspace,
  intentId,
  { providerOverride } = {},
) {
  const settings = readAiSettings(workspaceRoot);
  if (!settings.api_key) {
    const error = new Error('DeepSeek API key is not configured in System > AI Settings.');
    error.statusCode = 400;
    throw error;
  }

  const intent = (workspace.intents || []).find((item) => item.id === intentId);
  if (!intent) {
    const error = new Error(`Intent ${intentId} was not found in the planning workspace.`);
    error.statusCode = 404;
    throw error;
  }

  const keyResults = selectKeyResultCandidates(workspace, intent);
  const releases = selectReleaseCandidates(workspace, intent);
  const prompt = buildPrompt({ settings, workspace, intent, keyResults, releases });
  const provider = providerOverride || createProvider({
    provider: 'deepseek',
    model: settings.model,
    endpoint: settings.endpoint,
    apiKey: settings.api_key,
  });

  let raw;
  let lastError = null;

  // Try structured extract up to 2 times
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      raw = RecommendationSchema.parse(
        await provider.extract(prompt, RecommendationJsonSchema),
      );
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      console.error(`[planning-assistant] extract attempt ${attempt}/2 failed:`, error.message);
    }
  }

  // Fallback to raw complete with retry
  if (!raw && provider.complete) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const fallbackResult = await provider.complete([
          {
            role: 'user',
            content: [
              prompt,
              '',
              'Return one compact JSON object only.',
              'Do not add prose before or after the JSON.',
              'Keep key_result_candidates to at most 3 items.',
              'Keep release_candidates to at most 3 items.',
              'If there is no strong KR match, choose propose-new-okr or out-of-scope instead of forcing a weak bind-existing answer.',
              `JSON schema:\n${JSON.stringify(RecommendationJsonSchema, null, 2)}`,
            ].join('\n'),
          },
        ], {
          maxTokens: 2000,
        });
        const parsed = parseJsonBlock(fallbackResult.text);
        parsed.key_result_candidates = Array.isArray(parsed.key_result_candidates)
          ? parsed.key_result_candidates.slice(0, 3)
          : [];
        parsed.release_candidates = Array.isArray(parsed.release_candidates)
          ? parsed.release_candidates.slice(0, 3)
          : [];
        raw = RecommendationSchema.parse(parsed);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        console.error(`[planning-assistant] fallback attempt ${attempt}/2 failed:`, error.message);
        if (attempt === 2) {
          console.error('[planning-assistant] all retries exhausted');
        }
      }
    }
  }

  if (!raw) {
    throw lastError || new Error('Assistant planning failed after multiple attempts.');
  }

  return {
    ok: true,
    intent_id: intent.id,
    provider: 'deepseek',
    model: settings.model,
    generated_at: new Date().toISOString(),
    suggestion: enrichRecommendations(raw, keyResults, releases),
  };
}

module.exports = {
  RecommendationSchema,
  selectKeyResultCandidates,
  selectReleaseCandidates,
  buildPrompt,
  generateIntentPlanSuggestion,
};
