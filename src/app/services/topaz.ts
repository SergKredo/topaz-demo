import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TopazService {
  private onMessage?: (data: any) => void;
  readonly baseUrl = (() => {
    if (typeof window === 'undefined') {
      return 'http://localhost:47289/sigweb';
    }

    // If the demo is served over HTTPS on localhost (the bridge), use same-origin to avoid mixed content.
    if (window.location.protocol === 'https:' && window.location.hostname === 'localhost') {
      return `${window.location.origin}/sigweb`;
    }

    // If the demo is served over HTTPS on a non-localhost origin (e.g. GitHub Pages), use the local bridge.
    if (window.location.protocol === 'https:' && window.location.hostname !== 'localhost') {
      return 'https://localhost:9443/sigweb';
    }

    // Local dev over HTTP.
    return 'http://localhost:47289/sigweb';
  })();

  readonly bridgeDetected = signal<boolean | null>(null);

  get isHttpsPage() {
    return typeof window !== 'undefined' && window.location.protocol === 'https:';
  }

  get bridgeOriginForDisplay() {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && window.location.hostname === 'localhost') {
      return window.location.origin;
    }
    return 'https://localhost:9443';
  }

  private get bridgeHealthUrl() {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && window.location.hostname === 'localhost') {
      return `${window.location.origin}/health`;
    }
    return 'https://localhost:9443/health';
  }

  refreshBridgeStatus() {
    if (typeof window === 'undefined') {
      this.bridgeDetected.set(null);
      return;
    }

    // Bridge is only relevant for HTTPS pages. For local HTTP (e.g. :4200), do not show it as an error.
    if (window.location.protocol !== 'https:') {
      this.bridgeDetected.set(null);
      return;
    }

    const url = this.bridgeHealthUrl;
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: () => this.bridgeDetected.set(true),
      error: () => this.bridgeDetected.set(false)
    });
  }
  private readonly postHeaders = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded'
  });

  readonly version = signal<string | null>(null);
  readonly tabletConnected = signal<boolean | null>(null);
  readonly lastAction = signal<string | null>(null);
  readonly lastError = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  private toHelpfulError(action: string, error: unknown) {
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const base = `Failed to ${action}.`;

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        // Status 0 in browsers usually means the request never completed (CORS/mixed content/cert/connection refused).
        if (isHttpsPage) {
          return (
            `${base} This page is running over HTTPS (GitHub Pages). Browsers block calls from an HTTPS page to ` +
            `http://localhost (mixed content), so the request may never reach SigWeb.\n\n` +
            `Best options: run this app locally over HTTP (ng serve), or use a local bridge/proxy on localhost ` +
            `that serves HTTPS and forwards to SigWeb.\n\n` +
            `If you tried https://localhost:47289 and DevTools shows ERR_SSL_PROTOCOL_ERROR, ` +
            `it usually means SigWeb is HTTP-only on that port (no TLS).`
          );
        }

        return (
          `${base} The request did not reach SigWeb (connection refused, CORS, or SigWeb not running). ` +
          `Verify http://localhost:47289/sigweb/version in your browser.`
        );
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return `${base} ${error.error.trim()}`;
      }

      return `${base} HTTP ${error.status} ${error.statusText || ''}`.trim();
    }

    return base;
  }

  connect(onMessage: (data: any) => void) {
    this.onMessage = onMessage;
  }

  refreshStatus() {
    this.refreshBridgeStatus();

    this.getText('/version').subscribe({
      next: (v) => this.version.set(this.normalizeTextResponse(v)),
      error: () => this.version.set(null)
    });

    this.getText('/TabletConnectQuery').subscribe({
      next: (v) => this.tabletConnected.set(this.normalizeTextResponse(v) === '1'),
      error: () => this.tabletConnected.set(null)
    });
  }

  private postNoBody(path: string) {
    return this.http.post(`${this.baseUrl}${path}`, 'x=', {
      headers: this.postHeaders,
      responseType: 'text'
    });
  }

  private getText(path: string) {
    return this.http.get(`${this.baseUrl}${path}`, { responseType: 'text' });
  }

  private normalizeTextResponse(value: string) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  private openTablet() {
    return this.postNoBody('/OpenTablet/0');
  }

  startCapture() {
    this.lastAction.set('Start');
    this.lastError.set(null);

    this.openTablet().subscribe({
      next: () => {
        this.postNoBody('/TabletState/1').subscribe({
          next: () => this.refreshStatus(),
          error: (e) => {
            this.lastError.set(this.toHelpfulError('switch the tablet into capture mode (TabletState/1)', e));
            this.refreshStatus();
          }
        });
      },
      error: (e) => {
        this.lastError.set(this.toHelpfulError('open the tablet (OpenTablet/0)', e));
        this.refreshStatus();
      }
    });
  }

  clear() {
    this.lastAction.set('Clear');
    this.lastError.set(null);

    this.getText('/ClearSignature').subscribe({
      next: () => this.refreshStatus(),
      error: (e) => {
        this.lastError.set(this.toHelpfulError('clear the signature (ClearSignature)', e));
        this.refreshStatus();
      }
    });
  }

  getImage() {
    this.lastAction.set('Save');
    this.lastError.set(null);

    this.getText('/SigImage/0').subscribe({
      next: (data) => {
        const normalized = this.normalizeTextResponse(data);
        if (normalized) {
          this.onMessage?.(normalized);
        } else {
          this.lastError.set(
            'SigWeb returned an empty image. This usually means no signature has been captured yet or the tablet is not connected.'
          );
        }
      },
      error: (e) => {
        this.lastError.set(this.toHelpfulError('fetch the signature image (SigImage/0)', e));
      }
    });
  }
}
