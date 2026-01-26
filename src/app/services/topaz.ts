import { Injectable, computed, signal } from '@angular/core';

type LogLevel = 'info' | 'warn' | 'error';

type LogItem = {
  ts: string;
  level: LogLevel;
  message: string;
};

@Injectable({
  providedIn: 'root'
})
export class TopazService {
  private onMessage?: (data: any) => void;
  readonly baseUrl = 'SigWebTablet.js (baseUri auto-detected)';

  readonly sdkLoaded = signal<boolean>(false);
  readonly sigwebInstalled = signal<boolean | null>(null);
  readonly isGitHubPages = signal<boolean>(false);

  readonly eventLog = signal<readonly LogItem[]>([]);

  readonly version = signal<string | null>(null);
  readonly tabletConnected = signal<boolean | null>(null);
  readonly tabletCaptureOn = signal<boolean | null>(null);

  readonly tabletModelNumber = signal<string | null>(null);
  readonly tabletSerialNumber = signal<string | null>(null);
  readonly firmwareRevision = signal<string | null>(null);

  readonly totalPoints = signal<number | null>(null);
  readonly numberOfStrokes = signal<number | null>(null);

  readonly hasSignature = computed(() => {
    const points = this.totalPoints() ?? 0;
    const strokes = this.numberOfStrokes() ?? 0;
    return points > 0 || strokes > 0;
  });

  readonly sigString = signal<string | null>(null);
  readonly lastAction = signal<string | null>(null);
  readonly lastError = signal<string | null>(null);

  constructor() {}

  private getSigWebTablet() {
    return (globalThis as any)?.SigWebTablet as SigWebTabletApi | undefined;
  }

  private nowIso() {
    return new Date().toISOString();
  }

  private pushLog(level: LogLevel, message: string) {
    const next: LogItem = { ts: this.nowIso(), level, message };
    const current = this.eventLog();
    this.eventLog.set([next, ...current].slice(0, 50));
  }

  clearEventLog() {
    this.eventLog.set([]);
  }

  private refreshEnvironment() {
    const sdk = this.getSigWebTablet();
    this.sdkLoaded.set(Boolean(sdk));

    try {
      const installed = sdk?.isSigWebInstalled ? sdk.isSigWebInstalled() : null;
      this.sigwebInstalled.set(typeof installed === 'boolean' ? installed : null);
    } catch {
      this.sigwebInstalled.set(null);
    }

    try {
      const host = globalThis.location?.hostname ?? '';
      this.isGitHubPages.set(host.endsWith('github.io'));
    } catch {
      this.isGitHubPages.set(false);
    }
  }

  private afterActionRefresh(options?: { device?: boolean; stats?: boolean }) {
    this.refreshStatus();
    if (options?.device) this.refreshDeviceInfo();
    if (options?.stats) this.refreshSignatureStats();

    setTimeout(() => {
      this.refreshStatus();
      if (options?.device) this.refreshDeviceInfo();
      if (options?.stats) this.refreshSignatureStats();
    }, 500);
  }

  connect(onMessage: (data: any) => void) {
    this.onMessage = onMessage;
  }

  refreshStatus() {
    this.refreshEnvironment();
    try {
      const sdk = this.getSigWebTablet();
      const v = sdk?.getVersion ? sdk.getVersion() : null;
      if (typeof v === 'string') {
        this.version.set(this.normalizeTextResponse(v));
      } else {
        this.version.set(null);
      }
    } catch {
      this.version.set(null);
    }

    try {
      const sdk = this.getSigWebTablet();
      const q = sdk?.tabletConnectQuery ? sdk.tabletConnectQuery() : null;
      if (typeof q === 'string') {
        this.tabletConnected.set(this.normalizeTextResponse(q) === '1');
      } else {
        this.tabletConnected.set(null);
      }
    } catch {
      this.tabletConnected.set(null);
    }

    try {
      const sdk = this.getSigWebTablet();
      const state = sdk?.getTabletState ? sdk.getTabletState() : null;
      if (typeof state === 'string') {
        this.tabletCaptureOn.set(this.normalizeTextResponse(state) === '1');
      } else {
        this.tabletCaptureOn.set(null);
      }
    } catch {
      this.tabletCaptureOn.set(null);
    }
  }

  refreshDeviceInfo() {
    try {
      const sdk = this.getSigWebTablet();
      const model = sdk?.getTabletModelNumber ? sdk.getTabletModelNumber() : null;
      this.tabletModelNumber.set(typeof model === 'string' ? this.normalizeTextResponse(model) : null);
    } catch {
      this.tabletModelNumber.set(null);
    }

    try {
      const sdk = this.getSigWebTablet();
      const serial = sdk?.getTabletSerialNumber ? sdk.getTabletSerialNumber() : null;
      this.tabletSerialNumber.set(typeof serial === 'string' ? this.normalizeTextResponse(serial) : null);
    } catch {
      this.tabletSerialNumber.set(null);
    }

    try {
      const sdk = this.getSigWebTablet();
      const fw = sdk?.getFirmwareRevision ? sdk.getFirmwareRevision() : null;
      this.firmwareRevision.set(typeof fw === 'string' ? this.normalizeTextResponse(fw) : null);
    } catch {
      this.firmwareRevision.set(null);
    }
  }

  refreshSignatureStats() {
    try {
      const sdk = this.getSigWebTablet();
      const points = sdk?.getTotalPoints ? sdk.getTotalPoints() : null;
      const normalized = typeof points === 'string' ? this.normalizeTextResponse(points) : '';
      const parsed = normalized ? Number(normalized) : NaN;
      this.totalPoints.set(Number.isFinite(parsed) ? parsed : null);
    } catch {
      this.totalPoints.set(null);
    }

    try {
      const sdk = this.getSigWebTablet();
      const strokes = sdk?.getNumberOfStrokes ? sdk.getNumberOfStrokes() : null;
      const normalized = typeof strokes === 'string' ? this.normalizeTextResponse(strokes) : '';
      const parsed = normalized ? Number(normalized) : NaN;
      this.numberOfStrokes.set(Number.isFinite(parsed) ? parsed : null);
    } catch {
      this.numberOfStrokes.set(null);
    }
  }

  private normalizeTextResponse(value: string) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  startCapture() {
    this.lastAction.set('Start');
    this.lastError.set(null);
    this.pushLog('info', 'Start capture');

    const sdk = this.getSigWebTablet();
    if (!sdk) {
      this.lastError.set(
        'SigWebTablet SDK is not available. Ensure SigWeb is installed/running and SigWebTablet.js is loaded by the page.'
      );
      this.pushLog('error', 'SDK not available');
      this.afterActionRefresh({ device: true, stats: true });
      return;
    }

    const start = () => {
      if (typeof sdk.startSignature !== 'function') {
        throw new Error('SigWebTablet.startSignature is not a function.');
      }
      return sdk.startSignature();
    };

    try {
      const result = start();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>)
          .then(() => this.afterActionRefresh({ device: true, stats: true }))
          .catch((err) => {
            this.lastError.set(`SigWebTablet.startSignature() failed: ${String(err)}`);
            this.pushLog('error', `startSignature failed: ${String(err)}`);
            this.afterActionRefresh({ device: true, stats: true });
          });
      } else {
        this.afterActionRefresh({ device: true, stats: true });
      }
    } catch (err) {
      // Older/variant installs sometimes require an explicit openTablet() call first.
      try {
        if (typeof sdk.openTablet === 'function') {
          const opened = sdk.openTablet();
          if (opened && typeof (opened as any).then === 'function') {
            (opened as Promise<unknown>)
              .then(() => start())
              .then(() => this.afterActionRefresh({ device: true, stats: true }))
              .catch((err2) => {
                this.lastError.set(`SigWebTablet open/start failed: ${String(err2)}`);
                this.pushLog('error', `open/start failed: ${String(err2)}`);
                this.afterActionRefresh({ device: true, stats: true });
              });
            return;
          }
          start();
          this.afterActionRefresh({ device: true, stats: true });
          return;
        }
      } catch (err2) {
        this.lastError.set(`SigWebTablet open/start failed: ${String(err2)}`);
        this.pushLog('error', `open/start failed: ${String(err2)}`);
        this.afterActionRefresh({ device: true, stats: true });
        return;
      }

      this.lastError.set(`SigWebTablet.startSignature() failed: ${String(err)}`);
      this.pushLog('error', `startSignature failed: ${String(err)}`);
      this.afterActionRefresh({ device: true, stats: true });
    }
  }

  stopCapture() {
    this.lastAction.set('Stop');
    this.lastError.set(null);
    this.pushLog('info', 'Stop capture');

    const sdk = this.getSigWebTablet();
    if (!sdk?.stopSignature) {
      this.lastError.set('SigWebTablet.stopSignature() is not available.');
      this.pushLog('error', 'stopSignature not available');
      this.afterActionRefresh({ stats: true });
      return;
    }

    try {
      const result = sdk.stopSignature();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>)
          .then(() => this.afterActionRefresh({ stats: true }))
          .catch((err) => {
            this.lastError.set(`SigWebTablet.stopSignature() failed: ${String(err)}`);
            this.pushLog('error', `stopSignature failed: ${String(err)}`);
            this.afterActionRefresh({ stats: true });
          });
      } else {
        this.afterActionRefresh({ stats: true });
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.stopSignature() failed: ${String(err)}`);
      this.pushLog('error', `stopSignature failed: ${String(err)}`);
      this.afterActionRefresh({ stats: true });
    }
  }

  closeTablet() {
    this.lastAction.set('Close');
    this.lastError.set(null);
    this.pushLog('info', 'Close tablet');

    const sdk = this.getSigWebTablet();
    if (!sdk?.closeTablet) {
      this.lastError.set('SigWebTablet.closeTablet() is not available.');
      this.pushLog('error', 'closeTablet not available');
      this.afterActionRefresh({ stats: true });
      return;
    }

    try {
      const result = sdk.closeTablet();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>)
          .then(() => this.afterActionRefresh({ stats: true }))
          .catch((err) => {
            this.lastError.set(`SigWebTablet.closeTablet() failed: ${String(err)}`);
            this.pushLog('error', `closeTablet failed: ${String(err)}`);
            this.afterActionRefresh({ stats: true });
          });
      } else {
        this.afterActionRefresh({ stats: true });
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.closeTablet() failed: ${String(err)}`);
      this.pushLog('error', `closeTablet failed: ${String(err)}`);
      this.afterActionRefresh({ stats: true });
    }
  }

  exportSigString() {
    this.lastAction.set('Export SigString');
    this.lastError.set(null);
    this.pushLog('info', 'Export SigString');

    const sdk = this.getSigWebTablet();
    if (!sdk?.getSigString) {
      this.lastError.set('SigWebTablet.getSigString() is not available.');
      this.pushLog('error', 'getSigString not available');
      return null;
    }

    try {
      const value = sdk.getSigString();
      if (typeof value === 'string') {
        const normalized = this.normalizeTextResponse(value);
        this.sigString.set(normalized);
        this.afterActionRefresh({ stats: true });
        return normalized;
      }
      this.sigString.set(null);
      this.afterActionRefresh({ stats: true });
      return null;
    } catch (err) {
      this.lastError.set(`SigWebTablet.getSigString() failed: ${String(err)}`);
      this.pushLog('error', `getSigString failed: ${String(err)}`);
      this.sigString.set(null);
      this.afterActionRefresh({ stats: true });
      return null;
    }
  }

  importSigString(sigString: string) {
    this.lastAction.set('Import SigString');
    this.lastError.set(null);
    this.pushLog('info', 'Import SigString');

    const sdk = this.getSigWebTablet();
    if (!sdk?.setSigString) {
      this.lastError.set('SigWebTablet.setSigString() is not available.');
      this.pushLog('error', 'setSigString not available');
      return;
    }

    try {
      sdk.setSigString(sigString);
      this.sigString.set(sigString);
      this.afterActionRefresh({ stats: true });
    } catch (err) {
      this.lastError.set(`SigWebTablet.setSigString() failed: ${String(err)}`);
      this.pushLog('error', `setSigString failed: ${String(err)}`);
      this.afterActionRefresh({ stats: true });
    }
  }

  clear() {
    this.lastAction.set('Clear');
    this.lastError.set(null);
    this.pushLog('info', 'Clear signature');

    const sdk = this.getSigWebTablet();
    if (!sdk?.clearSignature) {
      this.lastError.set('SigWebTablet.clearSignature() is not available.');
      this.pushLog('error', 'clearSignature not available');
      this.afterActionRefresh({ stats: true });
      return;
    }

    try {
      const result = sdk.clearSignature();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>)
          .then(() => this.afterActionRefresh({ stats: true }))
          .catch((err) => {
            this.lastError.set(`SigWebTablet.clearSignature() failed: ${String(err)}`);
            this.pushLog('error', `clearSignature failed: ${String(err)}`);
            this.afterActionRefresh({ stats: true });
          });
      } else {
        this.afterActionRefresh({ stats: true });
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.clearSignature() failed: ${String(err)}`);
      this.pushLog('error', `clearSignature failed: ${String(err)}`);
      this.afterActionRefresh({ stats: true });
    }
  }

  getImage() {
    this.lastAction.set('Save');
    this.lastError.set(null);
    this.pushLog('info', 'Save image');

    if (!this.hasSignature()) {
      this.lastError.set('No signature data yet. Please sign first, then click Save.');
      this.pushLog('warn', 'Save attempted with empty signature');
      this.afterActionRefresh({ stats: true });
      return;
    }

    const sdk = this.getSigWebTablet();
    if (!sdk?.getSignatureImageBase64) {
      this.lastError.set('SigWebTablet.getSignatureImageBase64() is not available.');
      this.pushLog('error', 'getSignatureImageBase64 not available');
      return;
    }

    try {
      const result = sdk.getSignatureImageBase64();
      const handle = (b64: string) => {
        const normalized = this.normalizeTextResponse(b64);
        if (normalized) {
          this.onMessage?.(normalized);
        } else {
          this.lastError.set('SigWeb returned an empty image (no signature captured yet?).');
          this.pushLog('warn', 'Empty image returned');
        }
      };

      if (result && typeof (result as any).then === 'function') {
        (result as Promise<string>)
          .then((b64) => handle(b64))
          .catch((err) => {
            this.lastError.set(`SigWebTablet.getSignatureImageBase64() failed: ${String(err)}`);
            this.pushLog('error', `getSignatureImageBase64 failed: ${String(err)}`);
          });
      } else if (typeof result === 'string') {
        handle(result);
      } else {
        this.lastError.set('SigWebTablet.getSignatureImageBase64() returned no data.');
        this.pushLog('warn', 'getSignatureImageBase64 returned no data');
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.getSignatureImageBase64() failed: ${String(err)}`);
      this.pushLog('error', `getSignatureImageBase64 failed: ${String(err)}`);
    }
  }
}
