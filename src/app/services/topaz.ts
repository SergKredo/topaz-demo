import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TopazService {
  private onMessage?: (data: any) => void;
  readonly baseUrl = 'SigWebTablet.js (baseUri auto-detected)';

  readonly version = signal<string | null>(null);
  readonly tabletConnected = signal<boolean | null>(null);
  readonly tabletCaptureOn = signal<boolean | null>(null);

  readonly tabletModelNumber = signal<string | null>(null);
  readonly tabletSerialNumber = signal<string | null>(null);
  readonly firmwareRevision = signal<string | null>(null);

  readonly totalPoints = signal<number | null>(null);
  readonly numberOfStrokes = signal<number | null>(null);

  readonly sigString = signal<string | null>(null);
  readonly lastAction = signal<string | null>(null);
  readonly lastError = signal<string | null>(null);

  constructor() {}

  private getSigWebTablet() {
    return (globalThis as any)?.SigWebTablet as SigWebTabletApi | undefined;
  }

  connect(onMessage: (data: any) => void) {
    this.onMessage = onMessage;
  }

  refreshStatus() {
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

    const sdk = this.getSigWebTablet();
    if (!sdk) {
      this.lastError.set(
        'SigWebTablet SDK is not available. Ensure SigWeb is running and sigwebtablet.js is reachable at http://localhost:47290/sigwebtablet.js.'
      );
      this.refreshStatus();
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
          .then(() => this.refreshStatus())
          .catch((err) => {
            this.lastError.set(`SigWebTablet.startSignature() failed: ${String(err)}`);
            this.refreshStatus();
          });
      } else {
        this.refreshStatus();
      }
    } catch (err) {
      // Older/variant installs sometimes require an explicit openTablet() call first.
      try {
        if (typeof sdk.openTablet === 'function') {
          const opened = sdk.openTablet();
          if (opened && typeof (opened as any).then === 'function') {
            (opened as Promise<unknown>)
              .then(() => start())
              .then(() => this.refreshStatus())
              .catch((err2) => {
                this.lastError.set(`SigWebTablet open/start failed: ${String(err2)}`);
                this.refreshStatus();
              });
            return;
          }
          start();
          this.refreshStatus();
          return;
        }
      } catch (err2) {
        this.lastError.set(`SigWebTablet open/start failed: ${String(err2)}`);
        this.refreshStatus();
        return;
      }

      this.lastError.set(`SigWebTablet.startSignature() failed: ${String(err)}`);
      this.refreshStatus();
    }
  }

  stopCapture() {
    this.lastAction.set('Stop');
    this.lastError.set(null);

    const sdk = this.getSigWebTablet();
    if (!sdk?.stopSignature) {
      this.lastError.set('SigWebTablet.stopSignature() is not available.');
      this.refreshStatus();
      return;
    }

    try {
      const result = sdk.stopSignature();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>)
          .then(() => this.refreshStatus())
          .catch((err) => {
            this.lastError.set(`SigWebTablet.stopSignature() failed: ${String(err)}`);
            this.refreshStatus();
          });
      } else {
        this.refreshStatus();
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.stopSignature() failed: ${String(err)}`);
      this.refreshStatus();
    }
  }

  closeTablet() {
    this.lastAction.set('Close');
    this.lastError.set(null);

    const sdk = this.getSigWebTablet();
    if (!sdk?.closeTablet) {
      this.lastError.set('SigWebTablet.closeTablet() is not available.');
      this.refreshStatus();
      return;
    }

    try {
      const result = sdk.closeTablet();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>)
          .then(() => this.refreshStatus())
          .catch((err) => {
            this.lastError.set(`SigWebTablet.closeTablet() failed: ${String(err)}`);
            this.refreshStatus();
          });
      } else {
        this.refreshStatus();
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.closeTablet() failed: ${String(err)}`);
      this.refreshStatus();
    }
  }

  exportSigString() {
    this.lastAction.set('Export SigString');
    this.lastError.set(null);

    const sdk = this.getSigWebTablet();
    if (!sdk?.getSigString) {
      this.lastError.set('SigWebTablet.getSigString() is not available.');
      return null;
    }

    try {
      const value = sdk.getSigString();
      if (typeof value === 'string') {
        const normalized = this.normalizeTextResponse(value);
        this.sigString.set(normalized);
        return normalized;
      }
      this.sigString.set(null);
      return null;
    } catch (err) {
      this.lastError.set(`SigWebTablet.getSigString() failed: ${String(err)}`);
      this.sigString.set(null);
      return null;
    }
  }

  importSigString(sigString: string) {
    this.lastAction.set('Import SigString');
    this.lastError.set(null);

    const sdk = this.getSigWebTablet();
    if (!sdk?.setSigString) {
      this.lastError.set('SigWebTablet.setSigString() is not available.');
      return;
    }

    try {
      sdk.setSigString(sigString);
      this.sigString.set(sigString);
      this.refreshSignatureStats();
    } catch (err) {
      this.lastError.set(`SigWebTablet.setSigString() failed: ${String(err)}`);
    }
  }

  clear() {
    this.lastAction.set('Clear');
    this.lastError.set(null);

    const sdk = this.getSigWebTablet();
    if (!sdk?.clearSignature) {
      this.lastError.set('SigWebTablet.clearSignature() is not available.');
      this.refreshStatus();
      return;
    }

    try {
      const result = sdk.clearSignature();
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>)
          .then(() => this.refreshStatus())
          .catch((err) => {
            this.lastError.set(`SigWebTablet.clearSignature() failed: ${String(err)}`);
            this.refreshStatus();
          });
      } else {
        this.refreshStatus();
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.clearSignature() failed: ${String(err)}`);
      this.refreshStatus();
    }
  }

  getImage() {
    this.lastAction.set('Save');
    this.lastError.set(null);

    const sdk = this.getSigWebTablet();
    if (!sdk?.getSignatureImageBase64) {
      this.lastError.set('SigWebTablet.getSignatureImageBase64() is not available.');
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
        }
      };

      if (result && typeof (result as any).then === 'function') {
        (result as Promise<string>)
          .then((b64) => handle(b64))
          .catch((err) => {
            this.lastError.set(`SigWebTablet.getSignatureImageBase64() failed: ${String(err)}`);
          });
      } else if (typeof result === 'string') {
        handle(result);
      } else {
        this.lastError.set('SigWebTablet.getSignatureImageBase64() returned no data.');
      }
    } catch (err) {
      this.lastError.set(`SigWebTablet.getSignatureImageBase64() failed: ${String(err)}`);
    }
  }
}
