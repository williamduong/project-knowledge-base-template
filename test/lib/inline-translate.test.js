'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  protectDomainTerms,
  restoreDomainTerms,
  parseGoogleTranslatePayload,
} = require('../../src/lib/inline-translate');

test('protectDomainTerms preserves known domain terms with placeholders', () => {
  const result = protectDomainTerms('SVFactory maps each Intent to a Key Result inside the Workspace.');
  assert.match(result.text, /ZXQTERM\d+QXZ maps each ZXQTERM\d+QXZ to a ZXQTERM\d+QXZ inside the ZXQTERM\d+QXZ\./);
  assert.equal(result.replacements.length, 4);
});

test('restoreDomainTerms restores protected domain terms into translated text', () => {
  const protectedValue = protectDomainTerms('SVFactory and GraphDB stay unchanged.');
  const graphToken = protectedValue.replacements.find(([, term]) => term === 'GraphDB')?.[0];
  const svFactoryToken = protectedValue.replacements.find(([, term]) => term === 'SVFactory')?.[0];
  const restored = restoreDomainTerms(`${svFactoryToken} va ${graphToken} giu nguyen.`, protectedValue.replacements);
  assert.equal(restored, 'SVFactory va GraphDB giu nguyen.');
});

test('parseGoogleTranslatePayload joins translated fragments', () => {
  const translated = parseGoogleTranslatePayload([
    [
      ['Xin chao ', 'Hello ', null, null, 10],
      ['the gioi', 'world', null, null, 10],
    ],
  ]);
  assert.equal(translated, 'Xin chao the gioi');
});
