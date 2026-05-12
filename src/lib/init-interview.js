'use strict';

/**
 * init-interview.js
 * Onboarding interview pipeline for `kbx init`.
 * Collects project identity, goals, and rules from user input,
 * then generates seed files and a populated system-map.md.
 */

function askQuestion(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve((answer || '').trim()));
  });
}

/**
 * Run the interactive onboarding interview.
 * Returns a structured answers object.
 * @param {{ rl: readline.Interface, defaults?: object }} opts
 */
async function runInterview({ rl, defaults = {} }) {
  console.log('\n=== KB Onboarding Interview ===');
  console.log('Press Enter to accept the default shown in [brackets].\n');

  const projectName = (await askQuestion(rl, `Project name [${defaults.projectName || 'my-project'}]: `))
    || defaults.projectName || 'my-project';

  const description = (await askQuestion(rl, `Short description [A knowledge base for ${projectName}]: `))
    || `A knowledge base for ${projectName}.`;

  const team = (await askQuestion(rl, `Team / owner [${defaults.team || 'engineering'}]: `))
    || defaults.team || 'engineering';

  const stack = (await askQuestion(rl, `Tech stack, comma-separated [Node.js]: `))
    || defaults.stack || 'Node.js';

  const infra = (await askQuestion(rl, `Infrastructure (cloud / on-prem / hybrid) [cloud]: `))
    || defaults.infra || 'cloud';

  console.log('\nDefine up to 3 initial goals (press Enter to skip).');
  const goals = [];
  for (let i = 1; i <= 3; i++) {
    const g = await askQuestion(rl, `  Goal ${i} [skip]: `);
    if (g) goals.push(g);
  }

  console.log('\nDefine up to 3 initial rules (press Enter to skip).');
  const rules = [];
  for (let i = 1; i <= 3; i++) {
    const r = await askQuestion(rl, `  Rule ${i} [skip]: `);
    if (r) rules.push(r);
  }

  return { projectName, description, team, stack, infra, goals, rules };
}

/**
 * Return pre-filled SaaS preset answers. No interactive prompts needed.
 * @param {{ projectName: string }} opts
 */
function getSaasPreset({ projectName }) {
  return {
    projectName,
    description: `SaaS application knowledge base for ${projectName}.`,
    team: 'engineering',
    stack: 'Node.js, React, PostgreSQL',
    infra: 'cloud',
    goals: [
      'Operational Visibility — track system health and change history',
      'Change Safety — ensure every change is reviewed and gated before merge',
      'Onboarding — reduce time-to-productive for new team members',
      'Tech Debt — surface and systematically reduce technical debt',
    ],
    rules: [
      'Every intent must have an impact assessment before apply',
      'Retro is required before archiving any intent',
      'Release gate must pass chaos score threshold (≤ 50)',
    ],
  };
}

/**
 * Generate seed goals array from interview answers.
 */
function generateSeedGoals(answers) {
  const titles = answers.goals.length > 0
    ? answers.goals
    : ['Operational Visibility', 'Change Safety', 'Onboarding'];

  return titles.map((title, i) => ({
    id: `GOAL-${String(i + 1).padStart(3, '0')}`,
    title: title.split('—')[0].trim(),
    description: title,
    source: 'onboarding-interview',
    confidence: 'high',
    created_at: new Date().toISOString(),
  }));
}

/**
 * Generate seed rules array from interview answers.
 */
function generateSeedRules(answers) {
  const descriptions = answers.rules.length > 0
    ? answers.rules
    : [
      'Intent must have impact assessment before apply',
      'Retro required before archiving intent',
    ];

  return descriptions.map((description, i) => ({
    id: `KBX-P${String(i + 1).padStart(3, '0')}`,
    title: description.slice(0, 80),
    description,
    domain: 'P',
    status: 'draft',
    source: 'onboarding-interview',
    created_at: new Date().toISOString(),
  }));
}

/**
 * Render populated system-map.md content from interview answers.
 */
function renderSystemMap(answers) {
  const today = new Date().toISOString().slice(0, 10);

  const goalLines = answers.goals.length > 0
    ? answers.goals.map((g, i) => `- **GOAL-${String(i + 1).padStart(3, '0')}**: ${g}`).join('\n')
    : '- *(No goals defined during onboarding — run `kbx intent create` to add goals)*';

  const ruleLines = answers.rules.length > 0
    ? answers.rules.map((r, i) => `- **KBX-P${String(i + 1).padStart(3, '0')}**: ${r}`).join('\n')
    : '- *(No rules defined during onboarding)*';

  return `---
title: System Map
type: orientation
status: active
owner: ${answers.team}
time_state: current
verification: code-verified
last_updated: ${today}
last_verified: ${today}
---

# System Map

## Purpose
This document maps the system context for **${answers.projectName}**: its identity, tech stack, infrastructure, and initial governance anchors (goals and rules) established during onboarding.

## Project Identity

| Field | Value |
|-------|-------|
| Name | ${answers.projectName} |
| Description | ${answers.description} |
| Team / Owner | ${answers.team} |
| Tech Stack | ${answers.stack} |
| Infrastructure | ${answers.infra} |

## Initial Goals

${goalLines}

## Initial Rules

${ruleLines}

## Current State

Onboarding complete. Seed goals and rules written to \`.kb/graph/seed-goals.json\` and \`.kb/graph/seed-rules.json\`.

## Target State

Goals promoted to active governance after first sprint retro. Rules enforced by rule engine after Phase B (rule taxonomy normalization).

## Evidence

Generated by \`kbx init\` onboarding interview on ${today}.

## Open Questions

- Are all goals correctly scoped for the first sprint?
- Are seed rules sufficient or should domain-specific rules be added later?
`;
}

module.exports = {
  runInterview,
  getSaasPreset,
  generateSeedGoals,
  generateSeedRules,
  renderSystemMap,
};
