/**
 * Bug Capture SDK
 * A lightweight library to capture console logs, network traffic, and screenshots
 * for debugging purposes.
 */

import html2canvas from "html2canvas";

// Types
export interface ConsoleLogEntry {
  type: "log" | "error" | "warn" | "info" | "debug";
  message: string;
  timestamp: number;
  stack?: string;
}

export interface NetworkEntry {
  method: string;
  url: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  startTime: number;
  duration: number;
  size: number;
  type: string;
}

export interface UserAction {
  action: string;
  target: string;
  timestamp: number;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  timezone: string;
  cookiesEnabled: boolean;
}

export interface CaptureData {
  consoleLogs: ConsoleLogEntry[];
  networkLogs: NetworkEntry[];
  userActions: UserAction[];
  deviceInfo: DeviceInfo;
  pageUrl: string;
  screenshot?: string; // Base64 encoded image
}

export interface BugCaptureConfig {
  maxConsoleLogs?: number;
  maxNetworkLogs?: number;
  maxUserActions?: number;
  captureConsole?: boolean;
  captureNetwork?: boolean;
  captureUserActions?: boolean;
}

const DEFAULT_CONFIG: Required<BugCaptureConfig> = {
  maxConsoleLogs: 100,
  maxNetworkLogs: 50,
  maxUserActions: 50,
  captureConsole: true,
  captureNetwork: true,
  captureUserActions: true,
};

class BugCapture {
  private consoleLogs: ConsoleLogEntry[] = [];
  private networkLogs: NetworkEntry[] = [];
  private userActions: UserAction[] = [];
  private config: Required<BugCaptureConfig>;
  private originalConsole: Partial<Console> = {};
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private isInitialized = false;

  constructor(config: BugCaptureConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the bug capture SDK
   */
  init(): void {
    if (this.isInitialized) return;

    if (this.config.captureConsole) {
      this.initConsoleCapture();
    }

    if (this.config.captureNetwork) {
      this.initNetworkCapture();
    }

    if (this.config.captureUserActions) {
      this.initUserActionCapture();
    }

    this.isInitialized = true;
    console.info("[BugCapture] SDK initialized");
  }

  /**
   * Intercept console methods to capture logs
   */
  private initConsoleCapture(): void {
    const methods: Array<"log" | "error" | "warn" | "info" | "debug"> = [
      "log",
      "error",
      "warn",
      "info",
      "debug",
    ];

    methods.forEach((method) => {
      this.originalConsole[method] = console[method].bind(console);
      console[method] = (...args: unknown[]) => {
        this.addConsoleLog(method, args);
        this.originalConsole[method]?.(...args);
      };
    });

    // Capture uncaught errors
    window.addEventListener("error", (event) => {
      this.addConsoleLog("error", [event.message], event.error?.stack);
    });

    // Capture unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.addConsoleLog("error", [`Unhandled Promise Rejection: ${event.reason}`]);
    });
  }

  /**
   * Add a console log entry
   */
  private addConsoleLog(
    type: ConsoleLogEntry["type"],
    args: unknown[],
    stack?: string
  ): void {
    const entry: ConsoleLogEntry = {
      type,
      message: args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" "),
      timestamp: Date.now(),
      stack,
    };

    this.consoleLogs.push(entry);

    // Trim to max size
    if (this.consoleLogs.length > this.config.maxConsoleLogs) {
      this.consoleLogs = this.consoleLogs.slice(-this.config.maxConsoleLogs);
    }
  }

  /**
   * Intercept fetch and XMLHttpRequest to capture network traffic
   */
  private initNetworkCapture(): void {
    // Intercept fetch
    this.originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || "GET";
      const requestHeaders: Record<string, string> = {};
      
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            requestHeaders[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            requestHeaders[key] = value;
          });
        } else {
          Object.assign(requestHeaders, init.headers);
        }
      }

      let requestBody: string | undefined;
      if (init?.body) {
        if (typeof init.body === "string") {
          requestBody = init.body;
        } else if (init.body instanceof FormData) {
          requestBody = "[FormData]";
        } else {
          requestBody = "[Binary Data]";
        }
      }

      try {
        const response = await this.originalFetch!(input, init);
        const duration = performance.now() - startTime;

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let responseBody: string | undefined;
        let size = 0;

        try {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json") || contentType.includes("text/")) {
            responseBody = await clonedResponse.text();
            size = new Blob([responseBody]).size;
            // Truncate large responses
            if (responseBody.length > 10000) {
              responseBody = responseBody.substring(0, 10000) + "... [truncated]";
            }
          } else {
            const blob = await clonedResponse.blob();
            size = blob.size;
            responseBody = `[Binary: ${blob.type}, ${size} bytes]`;
          }
        } catch {
          responseBody = "[Unable to read response]";
        }

        this.addNetworkLog({
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          requestHeaders,
          responseHeaders,
          requestBody,
          responseBody,
          startTime,
          duration,
          size,
          type: response.headers.get("content-type") || "unknown",
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.addNetworkLog({
          method,
          url,
          status: 0,
          statusText: "Network Error",
          requestHeaders,
          responseHeaders: {},
          requestBody,
          responseBody: String(error),
          startTime,
          duration,
          size: 0,
          type: "error",
        });
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    const self = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ) {
      (this as any)._bugCapture = {
        method,
        url: url.toString(),
        startTime: 0,
        requestHeaders: {} as Record<string, string>,
      };
      return self.originalXHROpen!.call(this, method, url, async, username, password);
    };

    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
      if ((this as any)._bugCapture) {
        (this as any)._bugCapture.requestHeaders[name] = value;
      }
      return originalSetRequestHeader.call(this, name, value);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this;
      const captureData = (xhr as any)._bugCapture;

      if (captureData) {
        captureData.startTime = performance.now();
        captureData.requestBody = body ? String(body) : undefined;

        xhr.addEventListener("load", function () {
          const duration = performance.now() - captureData.startTime;
          const responseHeaders: Record<string, string> = {};
          
          xhr.getAllResponseHeaders().split("\r\n").forEach((line) => {
            const [key, value] = line.split(": ");
            if (key && value) {
              responseHeaders[key.toLowerCase()] = value;
            }
          });

          let responseBody = xhr.responseText;
          if (responseBody && responseBody.length > 10000) {
            responseBody = responseBody.substring(0, 10000) + "... [truncated]";
          }

          self.addNetworkLog({
            method: captureData.method,
            url: captureData.url,
            status: xhr.status,
            statusText: xhr.statusText,
            requestHeaders: captureData.requestHeaders,
            responseHeaders,
            requestBody: captureData.requestBody,
            responseBody,
            startTime: captureData.startTime,
            duration,
            size: new Blob([xhr.responseText || ""]).size,
            type: xhr.getResponseHeader("content-type") || "unknown",
          });
        });

        xhr.addEventListener("error", function () {
          const duration = performance.now() - captureData.startTime;
          self.addNetworkLog({
            method: captureData.method,
            url: captureData.url,
            status: 0,
            statusText: "Network Error",
            requestHeaders: captureData.requestHeaders,
            responseHeaders: {},
            requestBody: captureData.requestBody,
            responseBody: "Request failed",
            startTime: captureData.startTime,
            duration,
            size: 0,
            type: "error",
          });
        });
      }

      return self.originalXHRSend!.call(xhr, body);
    };
  }

  /**
   * Add a network log entry
   */
  private addNetworkLog(entry: NetworkEntry): void {
    this.networkLogs.push(entry);

    // Trim to max size
    if (this.networkLogs.length > this.config.maxNetworkLogs) {
      this.networkLogs = this.networkLogs.slice(-this.config.maxNetworkLogs);
    }
  }

  /**
   * Capture user actions (clicks, inputs, etc.)
   */
  private initUserActionCapture(): void {
    // Capture clicks
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      this.addUserAction({
        action: "click",
        target: this.getElementSelector(target),
        timestamp: Date.now(),
      });
    });

    // Capture input changes
    document.addEventListener("change", (event) => {
      const target = event.target as HTMLElement;
      this.addUserAction({
        action: "change",
        target: this.getElementSelector(target),
        timestamp: Date.now(),
      });
    });

    // Capture form submissions
    document.addEventListener("submit", (event) => {
      const target = event.target as HTMLElement;
      this.addUserAction({
        action: "submit",
        target: this.getElementSelector(target),
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Get a CSS selector for an element
   */
  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.className) {
        const classes = current.className.split(" ").filter(Boolean).slice(0, 2);
        if (classes.length) {
          selector += "." + classes.join(".");
        }
      }

      parts.unshift(selector);
      current = current.parentElement;

      if (parts.length >= 3) break;
    }

    return parts.join(" > ");
  }

  /**
   * Add a user action entry
   */
  private addUserAction(action: UserAction): void {
    this.userActions.push(action);

    // Trim to max size
    if (this.userActions.length > this.config.maxUserActions) {
      this.userActions = this.userActions.slice(-this.config.maxUserActions);
    }
  }

  /**
   * Get device and browser information
   */
  getDeviceInfo(): DeviceInfo {
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
      cookiesEnabled: navigator.cookieEnabled,
    };
  }

  /**
   * Capture a screenshot of the current page
   */
  async captureScreenshot(): Promise<string> {
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("[BugCapture] Screenshot capture failed:", error);
      throw error;
    }
  }

  /**
   * Get all captured data
   */
  async getCaptureData(includeScreenshot = true): Promise<CaptureData> {
    const data: CaptureData = {
      consoleLogs: [...this.consoleLogs],
      networkLogs: [...this.networkLogs],
      userActions: [...this.userActions],
      deviceInfo: this.getDeviceInfo(),
      pageUrl: window.location.href,
    };

    if (includeScreenshot) {
      try {
        data.screenshot = await this.captureScreenshot();
      } catch {
        // Screenshot failed, continue without it
      }
    }

    return data;
  }

  /**
   * Clear all captured data
   */
  clear(): void {
    this.consoleLogs = [];
    this.networkLogs = [];
    this.userActions = [];
  }

  /**
   * Restore original console and network methods
   */
  destroy(): void {
    // Restore console
    Object.keys(this.originalConsole).forEach((method) => {
      (console as any)[method] = this.originalConsole[method as keyof Console];
    });

    // Restore fetch
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }

    // Restore XMLHttpRequest
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
    }
    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
    }

    this.isInitialized = false;
    this.clear();
  }

  /**
   * Get console logs
   */
  getConsoleLogs(): ConsoleLogEntry[] {
    return [...this.consoleLogs];
  }

  /**
   * Get network logs
   */
  getNetworkLogs(): NetworkEntry[] {
    return [...this.networkLogs];
  }

  /**
   * Get user actions
   */
  getUserActions(): UserAction[] {
    return [...this.userActions];
  }
}

// Export singleton instance
export const bugCapture = new BugCapture();

// Export class for custom instances
export { BugCapture };
