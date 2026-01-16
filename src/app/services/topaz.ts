import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TopazService {
  private onMessage?: (data: any) => void;
  readonly baseUrl = 'http://localhost:47289/sigweb';
  private readonly postHeaders = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded'
  });

  readonly version = signal<string | null>(null);
  readonly tabletConnected = signal<boolean | null>(null);
  readonly lastAction = signal<string | null>(null);
  readonly lastError = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  connect(onMessage: (data: any) => void) {
    this.onMessage = onMessage;
  }

  refreshStatus() {
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
          error: () => {
            this.lastError.set('Failed to switch the tablet into capture mode (TabletState/1).');
            this.refreshStatus();
          }
        });
      },
      error: () => {
        this.lastError.set('Failed to open the tablet (OpenTablet/0). Check SigWeb and the device connection.');
        this.refreshStatus();
      }
    });
  }

  clear() {
    this.lastAction.set('Clear');
    this.lastError.set(null);

    this.getText('/ClearSignature').subscribe({
      next: () => this.refreshStatus(),
      error: () => {
        this.lastError.set('Failed to clear the signature (ClearSignature).');
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
      error: () => {
        this.lastError.set('Failed to fetch the signature image (SigImage/0).');
      }
    });
  }
}
