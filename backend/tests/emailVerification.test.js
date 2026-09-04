const test = require('node:test');
const assert = require('node:assert/strict');

const { createVerificationEmailTemplate } = require('../src/utils/email');

test('createVerificationEmailTemplate includes the recipient name and verification link', () => {
  const html = createVerificationEmailTemplate('Ayesha', 'https://example.com/verify?token=abc123');

  assert.match(html, /Ayesha/);
  assert.match(html, /https:\/\/example\.com\/verify\?token=abc123/);
  assert.match(html, /Verify Email/i);
});
