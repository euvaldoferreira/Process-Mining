(function () {
  const privacy = window.ProcessMiningUtils;
  const captureAttributes = ['id', 'name', 'className', 'placeholder', 'aria-label', 'role'];

  function getContextFromElement(target) {
    const fieldName = target.getAttribute('name') || target.getAttribute('id') || '';
    const fieldId = target.getAttribute('id') || '';
    const placeholder = target.getAttribute('placeholder') || '';
    const inputType = target.type || 'text';
    const link = target.closest ? target.closest('a[href]') : null;
    const href = link ? link.getAttribute('href') : '';
    return { fieldName, fieldId, placeholder, inputType, href };
  }

  function buildSelector(target) {
    if (!(target instanceof Element)) return '';
    const parts = [];
    let node = target;
    while (node && node.nodeType === 1 && parts.length < 8) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(part + '#' + node.id);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.prototype.filter.call(parent.children, function (child) {
          return child.tagName === node.tagName;
        });
        if (siblings.length > 1) {
          part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
        }
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ');
  }

  function isInFrame() {
    try {
      return window !== window.top;
    } catch (error) {
      return true;
    }
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
      value,
      selector: buildSelector(target),
      inFrame: isInFrame()
    };
  }

  function captureClick(target) {
    const context = getContextFromElement(target);
    return {
      type: 'click',
      url: window.location.href,
      tag: target.tagName,
      text: (target.innerText || '').slice(0, 200),
      context,
      selector: buildSelector(target),
      inFrame: isInFrame()
    };
  }

  function captureError(error) {
    return {
      type: 'error',
      url: window.location.href,
      message: privacy.sanitizeValue(error && error.message ? error.message : String(error)),
      stack: privacy.sanitizeValue(error && error.stack ? error.stack : ''),
      inFrame: isInFrame()
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
    sendEvent({
      type: 'visibility',
      url: window.location.href,
      visible: document.visibilityState === 'visible',
      inFrame: isInFrame()
    });
  });
})();
