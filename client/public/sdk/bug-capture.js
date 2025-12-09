/**
 * Bug Capture SDK - Embeddable Script
 * Captures console logs, network traffic, and screenshots for debugging
 */
(function(window) {
  'use strict';

  // Configuration
  const DEFAULT_CONFIG = {
    projectKey: '',
    apiEndpoint: '',
    showButton: true,
    buttonPosition: 'bottom-right',
    captureConsole: true,
    captureNetwork: true,
    captureUserActions: true,
    maxConsoleLogs: 100,
    maxNetworkLogs: 50,
    maxUserActions: 50,
  };

  // State
  let config = { ...DEFAULT_CONFIG };
  let consoleLogs = [];
  let networkLogs = [];
  let userActions = [];
  let isInitialized = false;
  let originalConsole = {};
  let originalFetch = null;
  let originalXHROpen = null;
  let originalXHRSend = null;

  // Console capture
  function initConsoleCapture() {
    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    
    methods.forEach(function(method) {
      originalConsole[method] = console[method].bind(console);
      console[method] = function() {
        const args = Array.prototype.slice.call(arguments);
        addConsoleLog(method, args);
        originalConsole[method].apply(console, args);
      };
    });

    window.addEventListener('error', function(event) {
      addConsoleLog('error', [event.message], event.error ? event.error.stack : undefined);
    });

    window.addEventListener('unhandledrejection', function(event) {
      addConsoleLog('error', ['Unhandled Promise Rejection: ' + event.reason]);
    });
  }

  function addConsoleLog(type, args, stack) {
    const entry = {
      type: type,
      message: args.map(function(arg) {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' '),
      timestamp: Date.now(),
      stack: stack
    };

    consoleLogs.push(entry);
    if (consoleLogs.length > config.maxConsoleLogs) {
      consoleLogs = consoleLogs.slice(-config.maxConsoleLogs);
    }
  }

  // Network capture
  function initNetworkCapture() {
    // Intercept fetch
    originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : (input.url || input.href || String(input));
      const method = (init && init.method) || 'GET';
      const requestHeaders = {};
      
      if (init && init.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach(function(value, key) {
            requestHeaders[key] = value;
          });
        } else if (typeof init.headers === 'object') {
          Object.keys(init.headers).forEach(function(key) {
            requestHeaders[key] = init.headers[key];
          });
        }
      }

      return originalFetch.apply(window, arguments).then(function(response) {
        const duration = performance.now() - startTime;
        const responseHeaders = {};
        response.headers.forEach(function(value, key) {
          responseHeaders[key] = value;
        });

        addNetworkLog({
          method: method,
          url: url,
          status: response.status,
          statusText: response.statusText,
          requestHeaders: requestHeaders,
          responseHeaders: responseHeaders,
          startTime: startTime,
          duration: duration,
          size: 0,
          type: response.headers.get('content-type') || 'unknown'
        });

        return response;
      }).catch(function(error) {
        const duration = performance.now() - startTime;
        addNetworkLog({
          method: method,
          url: url,
          status: 0,
          statusText: 'Network Error',
          requestHeaders: requestHeaders,
          responseHeaders: {},
          startTime: startTime,
          duration: duration,
          size: 0,
          type: 'error'
        });
        throw error;
      });
    };

    // Intercept XMLHttpRequest
    originalXHROpen = XMLHttpRequest.prototype.open;
    originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
      this._bugCapture = {
        method: method,
        url: url.toString(),
        startTime: 0,
        requestHeaders: {}
      };
      return originalXHROpen.apply(this, arguments);
    };

    var originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
      if (this._bugCapture) {
        this._bugCapture.requestHeaders[name] = value;
      }
      return originalSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
      var xhr = this;
      var captureData = xhr._bugCapture;

      if (captureData) {
        captureData.startTime = performance.now();

        xhr.addEventListener('load', function() {
          var duration = performance.now() - captureData.startTime;
          var responseHeaders = {};
          
          xhr.getAllResponseHeaders().split('\r\n').forEach(function(line) {
            var parts = line.split(': ');
            if (parts[0] && parts[1]) {
              responseHeaders[parts[0].toLowerCase()] = parts[1];
            }
          });

          addNetworkLog({
            method: captureData.method,
            url: captureData.url,
            status: xhr.status,
            statusText: xhr.statusText,
            requestHeaders: captureData.requestHeaders,
            responseHeaders: responseHeaders,
            startTime: captureData.startTime,
            duration: duration,
            size: (xhr.responseText || '').length,
            type: xhr.getResponseHeader('content-type') || 'unknown'
          });
        });

        xhr.addEventListener('error', function() {
          var duration = performance.now() - captureData.startTime;
          addNetworkLog({
            method: captureData.method,
            url: captureData.url,
            status: 0,
            statusText: 'Network Error',
            requestHeaders: captureData.requestHeaders,
            responseHeaders: {},
            startTime: captureData.startTime,
            duration: duration,
            size: 0,
            type: 'error'
          });
        });
      }

      return originalXHRSend.apply(xhr, arguments);
    };
  }

  function addNetworkLog(entry) {
    networkLogs.push(entry);
    if (networkLogs.length > config.maxNetworkLogs) {
      networkLogs = networkLogs.slice(-config.maxNetworkLogs);
    }
  }

  // User action capture
  function initUserActionCapture() {
    document.addEventListener('click', function(event) {
      addUserAction('click', getElementSelector(event.target));
    });

    document.addEventListener('change', function(event) {
      addUserAction('change', getElementSelector(event.target));
    });

    document.addEventListener('submit', function(event) {
      addUserAction('submit', getElementSelector(event.target));
    });
  }

  function getElementSelector(element) {
    if (!element || element === document.body) return 'body';
    if (element.id) return '#' + element.id;

    var parts = [];
    var current = element;

    while (current && current !== document.body && parts.length < 3) {
      var selector = current.tagName.toLowerCase();
      if (current.className) {
        var classes = current.className.split(' ').filter(Boolean).slice(0, 2);
        if (classes.length) {
          selector += '.' + classes.join('.');
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  function addUserAction(action, target) {
    userActions.push({
      action: action,
      target: target,
      timestamp: Date.now()
    });
    if (userActions.length > config.maxUserActions) {
      userActions = userActions.slice(-config.maxUserActions);
    }
  }

  // Device info
  function getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled
    };
  }

  // Screenshot capture using html2canvas
  function captureScreenshot() {
    return new Promise(function(resolve, reject) {
      // Check if html2canvas is available
      if (typeof html2canvas === 'undefined') {
        // Load html2canvas dynamically
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = function() {
          doCapture();
        };
        script.onerror = function() {
          // If html2canvas fails to load, resolve with null (no screenshot)
          console.warn('[BugCapture] Failed to load html2canvas, submitting without screenshot');
          resolve(null);
        };
        document.head.appendChild(script);
      } else {
        doCapture();
      }

      function doCapture() {
        // Convert OKLCH colors to RGB before capturing to avoid html2canvas errors
        var styleSheets = document.styleSheets;
        var originalStyles = [];
        
        try {
          // Try to capture with html2canvas
          html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            logging: false,
            scale: 1,
            ignoreElements: function(element) {
              // Ignore elements that might cause issues
              return element.id === 'bug-capture-button' || element.id === 'bug-capture-overlay';
            },
            onclone: function(clonedDoc) {
              // Remove problematic CSS that uses OKLCH
              var allElements = clonedDoc.querySelectorAll('*');
              allElements.forEach(function(el) {
                var computedStyle = window.getComputedStyle(el);
                // Apply computed RGB colors to override OKLCH
                if (computedStyle.backgroundColor) {
                  el.style.backgroundColor = computedStyle.backgroundColor;
                }
                if (computedStyle.color) {
                  el.style.color = computedStyle.color;
                }
                if (computedStyle.borderColor) {
                  el.style.borderColor = computedStyle.borderColor;
                }
              });
            }
          }).then(function(canvas) {
            resolve(canvas.toDataURL('image/png'));
          }).catch(function(error) {
            console.warn('[BugCapture] Screenshot capture failed:', error.message);
            // If screenshot fails, resolve with null instead of rejecting
            // This allows the bug report to still be submitted without a screenshot
            resolve(null);
          });
        } catch (error) {
          console.warn('[BugCapture] Screenshot capture error:', error.message);
          resolve(null);
        }
      }
    });
  }

  // Submit bug report
  function submitReport(options) {
    options = options || {};
    
    return captureScreenshot().then(function(screenshot) {
      var data = {
        projectKey: config.projectKey,
        title: options.title || 'Bug Report',
        description: options.description || '',
        pageUrl: window.location.href,
        consoleLogs: consoleLogs.slice(),
        networkLogs: networkLogs.slice(),
        userActions: userActions.slice(),
        deviceInfo: getDeviceInfo(),
        reporterEmail: options.reporterEmail,
        reporterName: options.reporterName
      };

      // Only include screenshot if it was captured successfully
      if (screenshot) {
        data.screenshot = screenshot;
      }

      return fetch(config.apiEndpoint + '/api/trpc/bugReports.submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ json: data })
      }).then(function(response) {
        return response.json();
      });
    });
  }

  // Create floating button
  function createButton() {
    var button = document.createElement('button');
    button.id = 'bug-capture-button';
    button.innerHTML = '🐛 Report Bug';
    
    var positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;'
    };

    button.style.cssText = 'position: fixed; ' + (positions[config.buttonPosition] || positions['bottom-right']) +
      ' z-index: 999999; padding: 12px 20px; background: #3b82f6; color: white; border: none; ' +
      'border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; ' +
      'box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;';

    button.onmouseover = function() {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    };
    button.onmouseout = function() {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };

    button.onclick = function() {
      showReportDialog();
    };

    document.body.appendChild(button);
  }

  // Create report dialog
  function showReportDialog() {
    var overlay = document.createElement('div');
    overlay.id = 'bug-capture-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; ' +
      'background: rgba(0,0,0,0.5); z-index: 9999999; display: flex; align-items: center; justify-content: center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; ' +
      'box-shadow: 0 20px 40px rgba(0,0,0,0.2);';

    dialog.innerHTML = '<h2 style="margin: 0 0 16px 0; font-size: 18px;">Report a Bug</h2>' +
      '<p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">Describe the issue you encountered. ' +
      'A screenshot and debug information will be captured automatically.</p>' +
      '<input type="text" id="bug-title" placeholder="Brief title" style="width: 100%; padding: 10px; ' +
      'border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; box-sizing: border-box; font-size: 14px;">' +
      '<textarea id="bug-description" placeholder="Describe the issue..." style="width: 100%; height: 100px; ' +
      'padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; resize: vertical; ' +
      'box-sizing: border-box; font-size: 14px;"></textarea>' +
      '<input type="email" id="bug-email" placeholder="Your email (optional)" style="width: 100%; padding: 10px; ' +
      'border: 1px solid #ddd; border-radius: 6px; margin-bottom: 16px; box-sizing: border-box; font-size: 14px;">' +
      '<div style="display: flex; gap: 12px;">' +
      '<button id="bug-cancel" style="flex: 1; padding: 10px; border: 1px solid #ddd; background: white; ' +
      'border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>' +
      '<button id="bug-submit" style="flex: 1; padding: 10px; border: none; background: #3b82f6; color: white; ' +
      'border-radius: 6px; cursor: pointer; font-size: 14px;">Submit Report</button>' +
      '</div>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.onclick = function(e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };

    document.getElementById('bug-cancel').onclick = function() {
      document.body.removeChild(overlay);
    };

    document.getElementById('bug-submit').onclick = function() {
      var title = document.getElementById('bug-title').value;
      var description = document.getElementById('bug-description').value;
      var email = document.getElementById('bug-email').value;

      var submitBtn = document.getElementById('bug-submit');
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;

      submitReport({
        title: title || 'Bug Report',
        description: description,
        reporterEmail: email || undefined
      }).then(function(result) {
        dialog.innerHTML = '<div style="text-align: center; padding: 20px;">' +
          '<div style="font-size: 48px; margin-bottom: 16px;">✅</div>' +
          '<h3 style="margin: 0 0 8px 0;">Thank you!</h3>' +
          '<p style="color: #666; margin: 0;">Your bug report has been submitted.</p>' +
          '</div>';
        setTimeout(function() {
          if (document.getElementById('bug-capture-overlay')) {
            document.body.removeChild(overlay);
          }
        }, 2000);
      }).catch(function(error) {
        submitBtn.textContent = 'Submit Report';
        submitBtn.disabled = false;
        alert('Failed to submit report: ' + error.message);
      });
    };
  }

  // Public API
  window.BugCapture = {
    init: function(options) {
      if (isInitialized) return;

      config = Object.assign({}, DEFAULT_CONFIG, options);

      if (!config.projectKey) {
        console.error('[BugCapture] projectKey is required');
        return;
      }
      if (!config.apiEndpoint) {
        console.error('[BugCapture] apiEndpoint is required');
        return;
      }

      if (config.captureConsole) {
        initConsoleCapture();
      }
      if (config.captureNetwork) {
        initNetworkCapture();
      }
      if (config.captureUserActions) {
        initUserActionCapture();
      }
      if (config.showButton) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', createButton);
        } else {
          createButton();
        }
      }

      isInitialized = true;
      console.info('[BugCapture] SDK initialized');
    },

    capture: function() {
      return {
        consoleLogs: consoleLogs.slice(),
        networkLogs: networkLogs.slice(),
        userActions: userActions.slice(),
        deviceInfo: getDeviceInfo(),
        pageUrl: window.location.href
      };
    },

    captureScreenshot: captureScreenshot,

    submit: submitReport,

    clear: function() {
      consoleLogs = [];
      networkLogs = [];
      userActions = [];
    },

    showDialog: showReportDialog
  };

})(window);
