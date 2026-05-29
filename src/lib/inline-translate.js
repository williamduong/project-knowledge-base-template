'use strict';

const DOMAIN_TERMS = [
  'SVFactory',
  'KBX',
  'Intent',
  'Objective',
  'Key Result',
  'GraphDB',
  'DNA',
  'Flow',
  'Gate',
  'Rules',
  'Workspace',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function protectDomainTerms(text) {
  let protectedText = String(text || '');
  const replacements = [];
  const sortedTerms = [...DOMAIN_TERMS].sort((left, right) => right.length - left.length);

  sortedTerms.forEach((term, index) => {
    const token = `ZXQTERM${index}QXZ`;
    const pattern = new RegExp(escapeRegex(term), 'g');
    if (pattern.test(protectedText)) {
      replacements.push([token, term]);
      protectedText = protectedText.replace(pattern, token);
    }
  });

  return {
    text: protectedText,
    replacements,
  };
}

function restoreDomainTerms(text, replacements) {
  return (replacements || []).reduce((current, [token, term]) => current.replaceAll(token, term), String(text || ''));
}

function parseGoogleTranslatePayload(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    throw new Error('Unexpected Google Translate response payload.');
  }

  return payload[0]
    .filter((part) => Array.isArray(part) && typeof part[0] === 'string')
    .map((part) => part[0])
    .join('');
}

async function translateInlineText({
  text,
  targetLanguage = 'vi',
  sourceLanguage = 'auto',
} = {}) {
  const sourceText = String(text || '').trim();
  if (!sourceText) {
    return {
      provider: 'google-translate',
      source_language: sourceLanguage,
      target_language: targetLanguage,
      translated_text: '',
    };
  }

  if (targetLanguage === 'en') {
    return {
      provider: 'google-translate',
      source_language: sourceLanguage,
      target_language: targetLanguage,
      translated_text: sourceText,
    };
  }

  const protectedPayload = protectDomainTerms(sourceText);
  const endpoint = new URL('https://translate.googleapis.com/translate_a/single');
  endpoint.searchParams.set('client', 'gtx');
  endpoint.searchParams.set('sl', sourceLanguage);
  endpoint.searchParams.set('tl', targetLanguage);
  endpoint.searchParams.set('dt', 't');
  endpoint.searchParams.set('q', protectedPayload.text);

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Translate request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const translated = parseGoogleTranslatePayload(payload);

  return {
    provider: 'google-translate',
    source_language: sourceLanguage,
    target_language: targetLanguage,
    translated_text: restoreDomainTerms(translated, protectedPayload.replacements),
  };
}

module.exports = {
  DOMAIN_TERMS,
  protectDomainTerms,
  restoreDomainTerms,
  parseGoogleTranslatePayload,
  translateInlineText,
};
