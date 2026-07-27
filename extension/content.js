(function () {
  const privacy = window.ProcessMiningUtils;
  const captureAttributes = ['id', 'name', 'className', 'placeholder', 'aria-label', 'role'];

  function getContextFromElement(target) {
    const fieldName = target.getAttribute('name') || target.getAttribute('id') || '';
    const fieldId = target.getAttribute('id') || '';
    const placeholder = target.getAttribute('placeholder') || '';
    const inputType = target.type || 'text';
    return { fieldName, fieldId, placeholder, inputType };
  }

  function captureInput(target) {
    const context = getContextFromElement(target);
    if (!privacy.shouldCaptureValue(context)) {
      return null;
    }
    const value = privacy.sanitizeValue(target.value);
    return {
      type: 'input',
      url: window.location.href,
      tag: target.tagName,
      context,
      value
    };
  }

  function captureClick(target) {
    const context = getContextFromElement(target);
    return {
      type: 'click',
      url: window.location.href,
      tag: target.tagName,
      text: (target.innerText || '').slice(0, 200),
      context
    };
  }

  function captureError(error) {
    return {
      type: 'error',
      url: window.location.href,
      message: privacy.sanitizeValue(error && error.message ? error.message : String(error)),
      stack: privacy.sanitizeValue(error && error.stack ? error.stack : '')
    };
  }

  function sendEvent(event) {
    chrome.runtime.sendMessage({ type: 'event', payload: event });
  }

  document.addEventListener('input', function (event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }
    const eventPayload = captureInput(target);
    if (eventPayload) {
      sendEvent(eventPayload);
    }
  }, true);

  document.addEventListener('click', function (event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    sendEvent(captureClick(target));
  }, true);

  window.addEventListener('error', function (event) {
    sendEvent(captureError(event.error || event.message));
  });

  window.addEventListener('unhandledrejection', function (event) {
    sendEvent(captureError(event.reason));
  });

  document.addEventListener('visibilitychange', function () {
    sendEvent({ type: 'visibility', url: window.location.href, visible: document.visibilityState === 'visible' });
  });
})();
