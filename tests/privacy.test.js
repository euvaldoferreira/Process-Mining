const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldCaptureValue, sanitizeValue } = require('../extension/utils/privacy.js');

test('skips password-like fields', function () {
  assert.equal(shouldCaptureValue({ inputType: 'password', fieldName: 'password' }), false);
});

test('captures non-sensitive values', function () {
  assert.equal(shouldCaptureValue({ inputType: 'text', fieldName: 'companyName' }), true);
});

test('truncates long values to reduce payload size', function () {
  const value = 'x'.repeat(300);
  const sanitized = sanitizeValue(value);
  assert.equal(sanitized.length, 200);
});
