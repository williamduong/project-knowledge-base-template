'use strict';

/**
 * KBX legacy terminology binding.
 *
 * This remains in the DNA layer because the canonical names, aliases, and
 * glossary resolution rules reflect KBX worldview rather than SVFactory core.
 */

const {
  GlossarySchema,
  TerminologyRegistryEntry,
} = require('../../../src/lib/dna/legacy-compat-contracts');

const TerminologyRegistry_data = {
  Tenant: {
    canonical_name: 'Tenant',
    aliases: ['Client', 'Customer', 'Account', 'Organization'],
    repo_origin: 'billing',
    microsoft_cdm_mapping: 'Account',
  },
  Subscription: {
    canonical_name: 'Subscription',
    aliases: ['Billing Plan', 'License', 'Tier'],
    repo_origin: 'billing',
    microsoft_cdm_mapping: 'Subscription',
  },
  ServicePrincipal: {
    canonical_name: 'ServicePrincipal',
    aliases: ['AgentIdentity', 'AppIdentity', 'SP', 'Machine', 'Bot', 'agent'],
    repo_origin: 'auth',
    microsoft_cdm_mapping: 'ServicePrincipal',
  },
  Project: {
    canonical_name: 'Project',
    aliases: ['Repo', 'Repository', 'Workspace', 'Team', 'project', 'project_id'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'Project',
  },
  Module: {
    canonical_name: 'Module',
    aliases: ['Component', 'Package', 'Library', 'Feature', 'module'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'Module',
  },
  Config: {
    canonical_name: 'Config',
    aliases: ['Configuration', 'Setting', 'Parameter', 'Environment', 'config', 'kbx.agent.md'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'Configuration',
  },
  Intent: {
    canonical_name: 'Intent',
    aliases: ['Task', 'Request', 'Proposal', 'Change', 'intent', 'intent_id', 'workflow'],
    repo_origin: 'auth',
    microsoft_cdm_mapping: 'WorkflowIntent',
  },
  Policy: {
    canonical_name: 'Policy',
    aliases: ['Rule', 'Governance Rule', 'AccessPolicy', 'Gate', 'policy', 'directive'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'ResourcePolicy',
  },
  CLICommand: {
    canonical_name: 'CLICommand',
    aliases: ['Command', 'Script', 'Action', 'Operation', 'command', 'kbx', 'subcommand'],
    repo_origin: 'infrastructure',
    microsoft_cdm_mapping: 'ExecutableCommand',
  },
  Evidence: {
    canonical_name: 'Evidence',
    aliases: ['Document', 'Claim', 'Proof', 'Record', 'Artifact', 'evidence', 'evidenceLinks', 'reasoning_trace'],
    repo_origin: 'auth',
    microsoft_cdm_mapping: 'Evidence',
  },
};

Object.values(TerminologyRegistry_data).forEach(entry => {
  TerminologyRegistryEntry.parse(entry);
});

const aliasToCanonical = {};
Object.values(TerminologyRegistry_data).forEach(entry => {
  entry.aliases.forEach(alias => {
    const key = alias.toLowerCase();
    if (aliasToCanonical[key] && aliasToCanonical[key] !== entry.canonical_name) {
      throw new Error(
        `Polysemy detected: alias "${alias}" maps to both "${aliasToCanonical[key]}" and "${entry.canonical_name}"`
      );
    }
    aliasToCanonical[key] = entry.canonical_name;
  });
});

const TerminologyRegistry_spec = Object.keys(TerminologyRegistry_data).length > 0
  ? TerminologyRegistry_data
  : {};

function buildGlossaryLookup(glossaryEntries = []) {
  const canonicalMap = {};
  const aliasMap = {};

  glossaryEntries.forEach(entry => {
    const canonicalKey = entry.canonical_name.toLowerCase();
    canonicalMap[canonicalKey] = entry;
    aliasMap[canonicalKey] = entry;

    (entry.aliases || []).forEach(alias => {
      aliasMap[alias.toLowerCase()] = entry;
    });
  });

  return { canonicalMap, aliasMap };
}

function resolveTerminology(term) {
  if (!term || typeof term !== 'string') {
    return null;
  }

  const key = term.toLowerCase();
  if (TerminologyRegistry_data[term]) {
    return TerminologyRegistry_data[term];
  }

  const canonical = aliasToCanonical[key];
  if (canonical && TerminologyRegistry_data[canonical]) {
    return TerminologyRegistry_data[canonical];
  }

  return null;
}

function resolveAgainstGovernedGlossary(term, glossaryEntries = []) {
  if (!term || typeof term !== 'string') {
    return null;
  }

  const lookup = buildGlossaryLookup(glossaryEntries);
  const entry = lookup.aliasMap[term.toLowerCase()];

  if (entry) {
    return {
      canonical_name: entry.canonical_name,
      repo_origin: resolveTerminology(entry.canonical_name)?.repo_origin || null,
      source: 'governed_glossary',
    };
  }

  const registryResolved = resolveTerminology(term);
  if (registryResolved) {
    return {
      canonical_name: registryResolved.canonical_name,
      repo_origin: registryResolved.repo_origin,
      source: 'terminology_registry',
    };
  }

  return null;
}

function validateTerminology(alias) {
  const resolved = resolveTerminology(alias);
  if (resolved) {
    return { valid: true, data: resolved };
  }

  return {
    valid: false,
    error: `Unresolved terminology: "${alias}" not found in TerminologyRegistry`,
  };
}

function validateGlossary(glossaryEntries) {
  let parsed;
  try {
    parsed = GlossarySchema.parse(glossaryEntries);
  } catch (error) {
    return {
      valid: false,
      errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  const errors = [];
  const canonicalSet = new Set();

  parsed.forEach(entry => {
    const canonicalKey = entry.canonical_name.toLowerCase();
    if (canonicalSet.has(canonicalKey)) {
      errors.push(`Duplicate canonical_name in glossary: ${entry.canonical_name}`);
    }
    canonicalSet.add(canonicalKey);

    const registryEntry = resolveTerminology(entry.canonical_name);
    if (!registryEntry || registryEntry.canonical_name !== entry.canonical_name) {
      errors.push(`canonical_name must resolve in TerminologyRegistry: ${entry.canonical_name}`);
    }

    (entry.aliases || []).forEach(alias => {
      const resolved = resolveTerminology(alias);
      if (!resolved) {
        errors.push(`Unresolved glossary alias: ${alias} (entry: ${entry.canonical_name})`);
        return;
      }
      if (resolved.canonical_name !== entry.canonical_name) {
        errors.push(
          `Alias maps to different canonical_name: ${alias} -> ${resolved.canonical_name} (expected: ${entry.canonical_name})`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    data: parsed,
    summary: {
      entries: parsed.length,
      canonicalCount: canonicalSet.size,
    },
  };
}

function auditNaturalLanguageTerms(payload = {}, options = {}) {
  const text = typeof payload === 'string' ? payload : (payload.text || '');
  const glossaryEntries = options.glossaryEntries || payload.glossary || [];
  const candidateTerms = Array.isArray(payload.candidate_terms) ? payload.candidate_terms : [];

  const mappedMap = new Map();
  const unresolvedSet = new Set();

  const registryCandidates = new Set();
  Object.values(TerminologyRegistry_data).forEach(entry => {
    registryCandidates.add(entry.canonical_name);
    entry.aliases.forEach(alias => registryCandidates.add(alias));
  });

  registryCandidates.forEach(term => {
    const rx = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');
    if (rx.test(text)) {
      const resolved = resolveAgainstGovernedGlossary(term, glossaryEntries);
      if (resolved) {
        mappedMap.set(term.toLowerCase(), {
          term,
          canonical_name: resolved.canonical_name,
          repo_origin: resolved.repo_origin,
          source: resolved.source,
        });
      }
    }
  });

  candidateTerms.forEach(term => {
    const resolved = resolveAgainstGovernedGlossary(term, glossaryEntries);
    if (resolved) {
      mappedMap.set(term.toLowerCase(), {
        term,
        canonical_name: resolved.canonical_name,
        repo_origin: resolved.repo_origin,
        source: resolved.source,
      });
    } else {
      unresolvedSet.add(term);
    }
  });

  const ambiguousUsage = [];
  const ambiguousPatterns = [
    /\b(this|that|a|an|our|their)\s+document\b/gi,
    /\b(this|that|a|an|our|their)\s+claim\b/gi,
  ];
  ambiguousPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      ambiguousUsage.push({
        fragment: match[0],
        rule: 'claim_document_generic_prose',
      });
    }
  });

  return {
    valid: unresolvedSet.size === 0 && ambiguousUsage.length === 0,
    mappedTerms: Array.from(mappedMap.values()),
    unresolvedTerms: Array.from(unresolvedSet.values()),
    ambiguousUsage,
    summary: {
      mapped: mappedMap.size,
      unresolved: unresolvedSet.size,
      ambiguous: ambiguousUsage.length,
    },
  };
}

module.exports = {
  TerminologyRegistryEntry,
  TerminologyRegistry: TerminologyRegistry_data,
  TerminologyRegistry_spec,
  aliasToCanonical,
  buildGlossaryLookup,
  resolveTerminology,
  resolveAgainstGovernedGlossary,
  validateTerminology,
  validateGlossary,
  auditNaturalLanguageTerms,
};
