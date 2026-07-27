(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ProcessMiningUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SENSITIVE_PATTERNS = [
    'password', 'passwd', 'pass', 'token', 'secret', 'authorization', 'cookie', 'card', 'cvv',
    'ssn', 'cpf', 'cnpj', 'email', 'username', 'user', 'login', 'senha'
  ];

  function shouldCaptureValue(context) {
    var composed = [context && context.fieldName, context && context.fieldId, context && context.placeholder]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!context || context.inputType === 'password' || context.inputType === 'hidden') {
      return false;
    }

    return !SENSITIVE_PATTERNS.some(function (pattern) {
      return composed.indexOf(pattern) !== -1;
    });
  }

  function sanitizeValue(value) {
    if (typeof value !== 'string') {
      return value;
    }

    var trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    return trimmed.slice(0, 200);
  }

  function buildBaseEvent(type, payload) {
    return {
      type: type,
      timestamp: new Date().toISOString(),
      payload: payload || {}
    };
  }

  return {
    shouldCaptureValue: shouldCaptureValue,
    sanitizeValue: sanitizeValue,
    buildBaseEvent: buildBaseEvent
  };
});
