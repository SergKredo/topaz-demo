import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TopazService } from '../services/topaz';

type HttpMethod = 'GET' | 'POST' | '(varies)';

type ApiParamLocation = 'path' | 'query' | 'body';

type ApiParam = {
  name: string;
  location: ApiParamLocation;
  meaning: string;
  example?: string;
};

type ApiDocItem = {
  id: string;
  group: string;
  method: HttpMethod;
  path: string;
  short: string;
  purpose: string[];
  params?: ApiParam[];
  requestBody?: string[];
  response?: string[];
  notes?: string[];
  usedByDemo?: boolean;
};

type RawApiDocItem = {
  group: string;
  key: string;
  raw: string;
  suffix: 'T' | 'TU' | null;
  methodGuess: HttpMethod;
  path: string;
  params: string[];
  short: string;
  notes: string[];
};

type RawApiGroup = {
  name: string;
  items: readonly RawApiDocItem[];
};

@Component({
  selector: 'app-signature',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './signature.html',
  styleUrl: './signature.css'
})
export class SignatureComponent implements OnInit {
  signatureImage?: string;
  sigStringDraft = '';

  expandedApiId: string | null = null;
  expandedRawApiKey: string | null = null;

  readonly apiDocs: readonly ApiDocItem[] = [
    {
      id: 'version',
      group: 'Verified endpoints (this demo uses)',
      method: 'GET',
      path: '/version',
      short: 'Service version string.',
      purpose: ['Use this to confirm SigWeb is running and reachable.'],
      response: ['A quoted string, e.g. "SigPlusNET 2.0.0.0" (quotes may be present).'],
      usedByDemo: true
    },
    {
      id: 'tablet-connect-query',
      group: 'Verified endpoints (this demo uses)',
      method: 'GET',
      path: '/TabletConnectQuery',
      short: 'Returns 1 if a tablet is detected, otherwise 0.',
      purpose: [
        'Check whether SigWeb currently detects a tablet.',
        'If it returns 0, capture/image endpoints may return empty results.'
      ],
      response: ['Typically "0" or "1" (sometimes quoted).'],
      usedByDemo: true
    },
    {
      id: 'open-tablet-0',
      group: 'Verified endpoints (this demo uses)',
      method: 'POST',
      path: '/OpenTablet/0',
      short: 'Opens the tablet (requires a non-empty body).',
      purpose: ['Start a session with the tablet so that capture can begin.'],
      requestBody: [
        'Send a small non-empty body so the request has Content-Length (e.g. application/x-www-form-urlencoded: x=).'
      ],
      notes: [
        'In this demo we send a small body (e.g. x=) to avoid HTTP 411 (Content-Length required).'
      ],
      usedByDemo: true
    },
    {
      id: 'tablet-state-1',
      group: 'Verified endpoints (this demo uses)',
      method: 'POST',
      path: '/TabletState/1',
      short: 'Switches the tablet into capture mode (requires a non-empty body).',
      purpose: ['Enable capture so the device starts sending pen data.'],
      requestBody: [
        'Send a small non-empty body so the request has Content-Length (e.g. application/x-www-form-urlencoded: x=).'
      ],
      notes: ['In this demo we send a small body (e.g. x=) to avoid HTTP 411 (Content-Length required).'],
      usedByDemo: true
    },
    {
      id: 'clear-signature',
      group: 'Verified endpoints (this demo uses)',
      method: 'GET',
      path: '/ClearSignature',
      short: 'Clears the current signature data.',
      purpose: ['Reset the captured signature buffer on the SigWeb side.'],
      usedByDemo: true
    },
    {
      id: 'sig-image-0',
      group: 'Verified endpoints (this demo uses)',
      method: 'GET',
      path: '/SigImage/0',
      short: 'Returns a base64 image payload (may be empty if nothing captured).',
      purpose: ['Fetch a rendered signature image after capture.'],
      response: ['Base64-encoded bytes (PNG/JPEG depending on host/device settings).'],
      notes: ['If nothing was captured (or tablet not connected), response can be empty.'],
      usedByDemo: true
    },
    {
      id: 'sig-string',
      group: 'Verified endpoints (this demo uses)',
      method: 'GET',
      path: '/SigString',
      short: 'Returns signature data as a string (often hex).',
      purpose: ['Fetch the signature in a compact textual form (format depends on settings).'],
      response: ['A string (often hex). Exact format depends on device/settings.'],
      usedByDemo: true
    },

    {
      id: 'open-tablet-raw',
      group: 'Tablet / capture',
      method: '(varies)',
      path: '/OpenTablet/{raw}',
      short: 'Open device/session (variant depends on host).',
      purpose: ['Open the tablet using a raw/configured mode value.'],
      params: [
        { name: 'raw', location: 'path', meaning: 'Mode/config value used by SigWeb for opening the tablet.', example: '0' }
      ],
      notes: ['This demo uses /OpenTablet/0.'],
    },
    {
      id: 'close-tablet',
      group: 'Tablet / capture',
      method: '(varies)',
      path: '/CloseTablet',
      short: 'Close device/session.',
      purpose: ['Stop using the tablet and close the current session.'],
    },
    {
      id: 'tablet-state',
      group: 'Tablet / capture',
      method: '(varies)',
      path: '/TabletState',
      short: 'Read capture state.',
      purpose: ['Query current capture state (whether capture is enabled).'],
    },
    {
      id: 'tablet-state-state',
      group: 'Tablet / capture',
      method: '(varies)',
      path: '/TabletState/{state}',
      short: 'Set capture state.',
      purpose: ['Enable/disable capture mode.'],
      params: [
        { name: 'state', location: 'path', meaning: 'Capture state value to set.', example: '1' }
      ],
      notes: ['This demo uses /TabletState/1 to enable capture.'],
    },
    {
      id: 'capture-mode',
      group: 'Tablet / capture',
      method: '(varies)',
      path: '/CaptureMode/{mode}',
      short: 'Change capture mode.',
      purpose: ['Switch capture mode behavior (depends on device/host).'],
      params: [{ name: 'mode', location: 'path', meaning: 'Capture mode value.', example: '0' }],
    },

    {
      id: 'sig-image-field',
      group: 'Signature data',
      method: '(varies)',
      path: '/SigImage/{field}',
      short: 'Image output (field typically 0).',
      purpose: ['Fetch a rendered signature image.'],
      params: [{ name: 'field', location: 'path', meaning: 'Output field/index used by SigWeb.', example: '0' }],
      notes: ['This demo uses /SigImage/0.'],
    },
    {
      id: 'number-of-strokes',
      group: 'Signature data',
      method: '(varies)',
      path: '/NumberOfStrokes',
      short: 'Number of strokes in the captured signature.',
      purpose: ['Use with PointXValue/PointYValue to read raw stroke data.'],
    },
    {
      id: 'point-x',
      group: 'Signature data',
      method: '(varies)',
      path: '/PointXValue/{stroke}/{point}',
      short: 'X coordinate for a point in a stroke.',
      purpose: ['Read raw signature points (X).'],
      params: [
        { name: 'stroke', location: 'path', meaning: 'Stroke index.', example: '0' },
        { name: 'point', location: 'path', meaning: 'Point index within the stroke.', example: '10' }
      ],
    },
    {
      id: 'point-y',
      group: 'Signature data',
      method: '(varies)',
      path: '/PointYValue/{stroke}/{point}',
      short: 'Y coordinate for a point in a stroke.',
      purpose: ['Read raw signature points (Y).'],
      params: [
        { name: 'stroke', location: 'path', meaning: 'Stroke index.', example: '0' },
        { name: 'point', location: 'path', meaning: 'Point index within the stroke.', example: '10' }
      ],
    },

    {
      id: 'lcd-clear',
      group: 'LCD (for LCD-capable tablets)',
      method: '(varies)',
      path: '/LcdClear',
      short: 'Clear the LCD.',
      purpose: ['Clear the LCD display area on supported tablets.'],
    },
    {
      id: 'lcd-size',
      group: 'LCD (for LCD-capable tablets)',
      method: '(varies)',
      path: '/LcdGetLcdSize',
      short: 'Get LCD dimensions.',
      purpose: ['Query LCD width/height so you can position drawings correctly.'],
    },
    {
      id: 'lcd-set-window',
      group: 'LCD (for LCD-capable tablets)',
      method: '(varies)',
      path: '/LcdSetWindow/{lcdwinstring}',
      short: 'Set the LCD drawing window.',
      purpose: ['Define the area of the LCD to draw into.'],
      params: [
        { name: 'lcdwinstring', location: 'path', meaning: 'Window definition string (format depends on SigWeb).', example: '"0,0,240,64"' }
      ],
      notes: ['Exact format varies; verify with your SigWeb version/device.'],
    },
    {
      id: 'lcd-write-image',
      group: 'LCD (for LCD-capable tablets)',
      method: '(varies)',
      path: '/LcdWriteImage/{value}',
      short: 'Write/draw an image on the LCD.',
      purpose: ['Send image data (or a reference) to be displayed on the LCD.'],
      params: [{ name: 'value', location: 'path', meaning: 'Image/value parameter used by SigWeb.', example: '0' }],
      notes: ['Some SigWeb builds use additional endpoints like /LcdWriteImageStream.'],
    },

    {
      id: 'tablet-com-port',
      group: 'Device configuration',
      method: '(varies)',
      path: '/TabletComPort/{pos}',
      short: 'Set serial COM port.',
      purpose: ['Configure which COM port SigWeb should use for serial-connected tablets.'],
      params: [{ name: 'pos', location: 'path', meaning: 'COM port number/value.', example: '3' }],
    },
    {
      id: 'tablet-baud',
      group: 'Device configuration',
      method: '(varies)',
      path: '/TabletBaudRate/{pos}',
      short: 'Set serial baud rate.',
      purpose: ['Configure baud rate for serial-connected tablets.'],
      params: [{ name: 'pos', location: 'path', meaning: 'Baud rate value.', example: '115200' }],
    },
    {
      id: 'tablet-rotation',
      group: 'Device configuration',
      method: '(varies)',
      path: '/TabletRotation/{pos}',
      short: 'Set tablet rotation.',
      purpose: ['Adjust capture orientation/rotation.'],
      params: [{ name: 'pos', location: 'path', meaning: 'Rotation value (device-specific).', example: '0' }],
    },
    {
      id: 'tablet-model-number',
      group: 'Device configuration',
      method: '(varies)',
      path: '/TabletModelNumber',
      short: 'Identify device model number.',
      purpose: ['Read the connected device model number.'],
    },
    {
      id: 'tablet-serial-number',
      group: 'Device configuration',
      method: '(varies)',
      path: '/TabletSerialNumber',
      short: 'Identify device serial number.',
      purpose: ['Read the connected device serial number.'],
    },
    {
      id: 'tablet-filter-points',
      group: 'Device configuration',
      method: '(varies)',
      path: '/TabletFilterPoints/{pos}',
      short: 'Tune point filtering/smoothing.',
      purpose: ['Adjust filtering of captured points (device/host dependent).'],
      params: [{ name: 'pos', location: 'path', meaning: 'Filter value.', example: '0' }],
    },
    {
      id: 'tablet-resolution',
      group: 'Device configuration',
      method: '(varies)',
      path: '/TabletResolution/{pos}',
      short: 'Set/query resolution parameter.',
      purpose: ['Adjust resolution setting (device/host dependent).'],
      params: [{ name: 'pos', location: 'path', meaning: 'Resolution value.', example: '0' }],
    }
  ];
  readonly sigwebApiPaths = `
/CaptureMode/{mode}T
/CaptureModeTU
/ClearHotSpotPointsT
/ClearSignatureTU
/ClearSigWindow/{inside}T
/clientaccesspolicy.xmlTU
/CloseTabletT
/CompressionMode/{mode}T
/CompressionModeTU
/DaysUntilCertificateExpiresTU
/DisableEventsTU
/EnableEventsTU
/EnableTabletEncryptionT
/EncryptionMode/{mode}T
/EncryptionModeTU
/EventStatusTU
/JustifyMode/{mode}T
/JustifyModeTU
/JustifyX/{pos}T
/JustifyXTU
/JustifyY/{pos}T
/JustifyYTU
/KeyPadClearHotSpotListT
/KeyPadQueryHotSpot/{keycode}TU
/KeyReceiptAsciiTU
/KeyStringT
/KeyStringTU
/LcdClearT
/LcdCompressionMode/{value}T
/LcdCompressionModeTU
/LcdGetLcdSizeTU
/LcdRefresh/{lcdrefreshstring}T
/LcdSendCmdData/T
/LcdSendCmdDataParams/{value}T
/LcdSendCmdString/T
/LcdSendCmdStringParams/{value}T
/LcdSetPixelDepth/{value}T
/LcdSetWindow/{lcdwinstring}T
/LcdWriteImage/{value}T
/LcdWriteImageStream/T
/LcdWriteImageTU
/LcdZCompressionMode/{value}T
/LcdZCompressionModeTU
/MaxLogFileSize/{pos}T
/NumberOfStrokesTU
/OpenTablet/{raw}T
/PointXValue/{stroke}/{point}TU
/PointYValue/{stroke}/{point}TU
/PortNumber/{pos}T
/ReloadT
/ResetParametersT
/ResetT
/SavePressureData/{value}T
/SavePressureDataTU
/SaveSigInfo/{value}T
/SaveSigInfoTU
/SaveTimeData/{value}T
/SaveTimeDataTU
/SerialPortCloseDelay/{pos}T
/SerialPortCloseDelayTU
/ServerTabletType/{pos}T
/ServerTabletTypeTU
/SetAutoKeyDataT
/SigGetScript/{name}TU
/SigImage/{field}TU
/SigLiveImageTU
/SigReceiptAsciiTU
/SigSockClientName/{pos}T
/SigSockClientNameTU
/SigSockPortNumber/{pos}T
/SigSockPortNumberTU
/SigSockServerPath/{pos}T
/SigSockServerPathTU
/SigStringT
/SigStringTU
/SigWebVersionTU
/SigWindow/{sigwinstring}T
/TabletBaudRate/{pos}T
/TabletBaudRateTU
/TabletComPort/{pos}T
/TabletComPortTU
/TabletComTest/{pos}T
/TabletComTestTU
/TabletConnectQueryTU
/TabletDataBytesTU
/TabletDataT
/TabletDataTU
/TabletEncryptionMode/{pos}T
/TabletEvents/{value}T
/TabletEventsTU
/TabletFilterPoints/{pos}T
/TabletFilterPointsTU
/TabletLocalIniFilePath/{pos}T
/TabletLogicalXSize/{pos}T
/TabletLogicalXSizeTU
/TabletLogicalYSize/{pos}T
/TabletLogicalYSizeTU
/TabletModel/{pos}T
/TabletModelNumberTU
/TabletPortPath/{pos}T
/TabletResolution/{pos}T
/TabletResolutionTU
/TabletRotation/{pos}T
/TabletRotationTU
/TabletSerialNumberTU
/TabletState/{state}T
/TabletStateTU
/TabletTimingAdvance/{pos}T
/TabletTimingAdvanceTU
/TabletType/{pos}T
/TabletTypeTU
/TabletXStart/{pos}T
/TabletXStartTU
/TabletXStop/{pos}T
/TabletXStopTU
/TabletYStart/{pos}T
/TabletYStartTU
/TabletYStop/{pos}T
/TabletYStopTU
/TimeStampT
`;

  readonly rawApiDocs: readonly RawApiDocItem[] = this.parseRawApiDocs(this.sigwebApiPaths);
  readonly rawApiGroups: readonly RawApiGroup[] = this.groupRawApiDocs(this.rawApiDocs);

  constructor(public topaz: TopazService) {}

  ngOnInit() {
    this.topaz.refreshStatus();
    this.topaz.refreshDeviceInfo();
  }

  toggleApiDetails(id: string) {
    this.expandedApiId = this.expandedApiId === id ? null : id;
  }

  toggleRawApiDetails(key: string) {
    this.expandedRawApiKey = this.expandedRawApiKey === key ? null : key;
  }

  private parseRawApiDocs(input: string): RawApiDocItem[] {
    const lines = input
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.map((raw) => {
      let suffix: 'T' | 'TU' | null = null;
      let path = raw;

      if (raw.endsWith('TU')) {
        suffix = 'TU';
        path = raw.slice(0, -2);
      } else if (raw.endsWith('T')) {
        suffix = 'T';
        path = raw.slice(0, -1);
      }

      const params: string[] = [];
      for (const match of path.matchAll(/\{([^}]+)\}/g)) {
        params.push(match[1]);
      }

      const methodGuess: HttpMethod = suffix === 'TU' ? 'GET' : suffix === 'T' ? 'POST' : '(varies)';
      const short = this.describeRawEndpoint(path);
      const notes: string[] = [];
      const group = this.groupForRawPath(path);

      if (suffix) {
        notes.push(`Host flag: ${suffix} (extracted from local SigWeb installation).`);
      }
      if (methodGuess === 'POST') {
        notes.push('Many command endpoints require POST with a non-empty body (e.g. x=) to avoid HTTP 411 (Content-Length required).');
      }
      if (params.length) {
        notes.push(`Path parameters: ${params.join(', ')}.`);
      }

      return {
        group,
        key: raw,
        raw,
        suffix,
        methodGuess,
        path,
        params,
        short,
        notes
      };
    });
  }

  private groupRawApiDocs(docs: readonly RawApiDocItem[]): RawApiGroup[] {
    const buckets = new Map<string, RawApiDocItem[]>();
    for (const item of docs) {
      const name = item.group;
      const list = buckets.get(name);
      if (list) {
        list.push(item);
      } else {
        buckets.set(name, [item]);
      }
    }

    const preferredOrder = [
      'Tablet / capture',
      'Signature data',
      'LCD',
      'KeyPad',
      'Encryption / security',
      'Events',
      'Layout / justification',
      'Networking / SigSock',
      'Diagnostics / info',
      'Host / maintenance',
      'Other'
    ];

    const orderIndex = new Map<string, number>();
    preferredOrder.forEach((name, idx) => orderIndex.set(name, idx));

    return Array.from(buckets.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => {
        const ai = orderIndex.get(a.name) ?? 999;
        const bi = orderIndex.get(b.name) ?? 999;
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name);
      });
  }

  private groupForRawPath(path: string): string {
    const clean = path.replace(/^\//, '');
    const name = clean.split('/')[0] ?? '';

    if (name.startsWith('Tablet') || name === 'OpenTablet' || name === 'CloseTablet' || name === 'CaptureMode') {
      return 'Tablet / capture';
    }
    if (
      name === 'SigImage' ||
      name === 'SigString' ||
      name === 'SigWindow' ||
      name === 'NumberOfStrokes' ||
      name === 'PointXValue' ||
      name === 'PointYValue' ||
      name === 'ClearSignature' ||
      name === 'ClearSigWindow' ||
      name === 'CompressionMode'
    ) {
      return 'Signature data';
    }
    if (name.startsWith('Lcd')) {
      return 'LCD';
    }
    if (name.startsWith('KeyPad') || name.startsWith('Key')) {
      return 'KeyPad';
    }
    if (name.includes('Encryption') || name === 'EncryptionMode' || name === 'EnableTabletEncryption') {
      return 'Encryption / security';
    }
    if (name.endsWith('Events') || name === 'EnableEvents' || name === 'DisableEvents' || name === 'EventStatus') {
      return 'Events';
    }
    if (name.startsWith('Justify')) {
      return 'Layout / justification';
    }
    if (name.startsWith('SigSock')) {
      return 'Networking / SigSock';
    }
    if (name === 'SigWebVersion' || name === 'DaysUntilCertificateExpires' || name === 'TimeStamp' || name === 'clientaccesspolicy.xml') {
      return 'Diagnostics / info';
    }
    if (name === 'Reload' || name === 'Reset' || name === 'ResetParameters' || name === 'MaxLogFileSize' || name === 'PortNumber') {
      return 'Host / maintenance';
    }

    return 'Other';
  }

  private describeRawEndpoint(path: string): string {
    const clean = path.replace(/^\//, '');
    const name = clean.split('/')[0] ?? '';

    switch (name) {
      case 'CaptureMode':
        return 'Set or query capture mode.';
      case 'ClearHotSpotPoints':
        return 'Clear keypad/hotspot point list (keypad/tablet feature).';
      case 'ClearSignature':
        return 'Clear captured signature buffer.';
      case 'ClearSigWindow':
        return 'Clear signature window/region (device-specific).';
      case 'clientaccesspolicy.xml':
        return 'Client access policy (legacy; used by older runtimes).';
      case 'CloseTablet':
        return 'Close the tablet session.';
      case 'CompressionMode':
        return 'Set or query signature/image compression mode.';
      case 'DaysUntilCertificateExpires':
        return 'Return days until the service certificate expires.';
      case 'DisableEvents':
        return 'Disable event reporting/streaming.';
      case 'EnableEvents':
        return 'Enable event reporting/streaming.';
      case 'EnableTabletEncryption':
        return 'Enable encryption for tablet communications.';
      case 'EncryptionMode':
        return 'Set or query encryption mode.';
      case 'EventStatus':
        return 'Query current event status.';
      case 'JustifyMode':
        return 'Set or query text/graphic justification mode.';
      case 'JustifyX':
        return 'Set or query X justification offset.';
      case 'JustifyY':
        return 'Set or query Y justification offset.';
      case 'KeyPadClearHotSpotList':
        return 'Clear keypad hotspot list.';
      case 'KeyPadQueryHotSpot':
        return 'Query keypad hotspot by keycode.';
      case 'KeyReceiptAscii':
        return 'Get keypad receipt text (ASCII).';
      case 'KeyString':
        return 'Get keypad key string/value.';
      case 'LcdClear':
        return 'Clear the tablet LCD.';
      case 'LcdCompressionMode':
        return 'Set or query LCD image compression mode.';
      case 'LcdGetLcdSize':
        return 'Get LCD dimensions.';
      case 'LcdRefresh':
        return 'Refresh LCD area/window.';
      case 'LcdSendCmdData':
        return 'Send raw command data to the LCD.';
      case 'LcdSendCmdDataParams':
        return 'Send LCD command data with parameters.';
      case 'LcdSendCmdString':
        return 'Send a command string to the LCD.';
      case 'LcdSendCmdStringParams':
        return 'Send a command string with parameters to the LCD.';
      case 'LcdSetPixelDepth':
        return 'Set LCD pixel depth.';
      case 'LcdSetWindow':
        return 'Set the LCD drawing window.';
      case 'LcdWriteImage':
        return 'Write/draw an image on the LCD.';
      case 'LcdWriteImageStream':
        return 'Stream image bytes to the LCD.';
      case 'LcdZCompressionMode':
        return 'Set or query LCD Z-compression mode.';
      case 'MaxLogFileSize':
        return 'Set or query maximum log file size.';
      case 'NumberOfStrokes':
        return 'Get number of strokes in the captured signature.';
      case 'OpenTablet':
        return 'Open the tablet session.';
      case 'PointXValue':
        return 'Get X coordinate for a raw signature point.';
      case 'PointYValue':
        return 'Get Y coordinate for a raw signature point.';
      case 'PortNumber':
        return 'Set or query service port number (host).';
      case 'Reload':
        return 'Reload host/service configuration.';
      case 'ResetParameters':
        return 'Reset configuration parameters to defaults.';
      case 'Reset':
        return 'Reset the service/device state.';
      case 'SavePressureData':
        return 'Enable/disable saving pressure data.';
      case 'SaveSigInfo':
        return 'Enable/disable saving signature metadata.';
      case 'SaveTimeData':
        return 'Enable/disable saving timing data.';
      case 'SerialPortCloseDelay':
        return 'Set/query serial port close delay.';
      case 'ServerTabletType':
        return 'Set/query server tablet type.';
      case 'SetAutoKeyData':
        return 'Configure automatic key data handling.';
      case 'SigGetScript':
        return 'Retrieve a signature script by name.';
      case 'SigImage':
        return 'Get rendered signature image.';
      case 'SigLiveImage':
        return 'Get live signature image stream/snapshot.';
      case 'SigReceiptAscii':
        return 'Get signature receipt text (ASCII).';
      case 'SigSockClientName':
        return 'Set/query signature socket client name.';
      case 'SigSockPortNumber':
        return 'Set/query signature socket port number.';
      case 'SigSockServerPath':
        return 'Set/query signature socket server path.';
      case 'SigString':
        return 'Get signature as a string (often hex).';
      case 'SigWebVersion':
        return 'Get SigWeb version.';
      case 'SigWindow':
        return 'Set signature capture window.';
      case 'TabletBaudRate':
        return 'Set/query tablet baud rate.';
      case 'TabletComPort':
        return 'Set/query tablet COM port.';
      case 'TabletComTest':
        return 'Test tablet COM connection.';
      case 'TabletConnectQuery':
        return 'Query whether a tablet is detected.';
      case 'TabletDataBytes':
        return 'Get raw tablet data bytes.';
      case 'TabletData':
        return 'Get tablet data payload.';
      case 'TabletEncryptionMode':
        return 'Set/query tablet encryption mode.';
      case 'TabletEvents':
        return 'Enable/disable tablet events.';
      case 'TabletFilterPoints':
        return 'Set/query point filtering.';
      case 'TabletLocalIniFilePath':
        return 'Set/query local INI file path used by the host.';
      case 'TabletLogicalXSize':
        return 'Set/query logical X size.';
      case 'TabletLogicalYSize':
        return 'Set/query logical Y size.';
      case 'TabletModel':
        return 'Set/query tablet model.';
      case 'TabletModelNumber':
        return 'Get tablet model number.';
      case 'TabletPortPath':
        return 'Set/query tablet port path.';
      case 'TabletResolution':
        return 'Set/query tablet resolution.';
      case 'TabletRotation':
        return 'Set/query tablet rotation.';
      case 'TabletSerialNumber':
        return 'Get tablet serial number.';
      case 'TabletState':
        return 'Set/query tablet capture state.';
      case 'TabletTimingAdvance':
        return 'Set/query tablet timing advance.';
      case 'TabletType':
        return 'Set/query tablet type.';
      case 'TabletXStart':
        return 'Set/query tablet X start.';
      case 'TabletXStop':
        return 'Set/query tablet X stop.';
      case 'TabletYStart':
        return 'Set/query tablet Y start.';
      case 'TabletYStop':
        return 'Set/query tablet Y stop.';
      case 'TimeStamp':
        return 'Get a timestamp value from the host.';
      default:
        return 'Endpoint extracted from SigWeb host (purpose varies by device/version).';
    }
  }

  private ensureConnected() {
    this.topaz.connect((data) => {
      this.signatureImage = `data:image/png;base64,${data}`;
    });
  }

  start() {
    this.ensureConnected();
    this.topaz.startCapture();
  }

  stop() {
    this.ensureConnected();
    this.topaz.stopCapture();
  }

  closeTablet() {
    this.ensureConnected();
    this.topaz.closeTablet();
  }

  clear() {
    this.ensureConnected();
    this.signatureImage = undefined;
    this.topaz.clear();
  }

  save() {
    this.ensureConnected();
    this.topaz.getImage();
  }

  refreshDeviceInfo() {
    this.topaz.refreshDeviceInfo();
    this.topaz.refreshStatus();
  }

  refreshStats() {
    this.topaz.refreshSignatureStats();
    this.topaz.refreshStatus();
  }

  exportSigString() {
    const value = this.topaz.exportSigString();
    if (value) {
      this.sigStringDraft = value;
    }
  }

  importSigString() {
    const trimmed = this.sigStringDraft.trim();
    if (!trimmed) {
      this.topaz.lastError.set('SigString is empty. Paste a value first.');
      return;
    }
    this.topaz.importSigString(trimmed);
  }
}
