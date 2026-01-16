# Local HTTPS bridge for SigWeb

Why this exists
- GitHub Pages serves the demo over HTTPS.
- Browsers block calls from an HTTPS page to `http://localhost` (mixed content).
- SigWeb is typically HTTP-only on `http://localhost:47289`.

This bridge provides an **HTTPS** endpoint on localhost and proxies requests to SigWeb over HTTP.

## Quick start
1) Make sure SigWeb is running and reachable:
   - `http://localhost:47289/sigweb/version`

2) Install dependencies (from repo root):
   - `npm install`

3) Build + start the demo over HTTPS (recommended):
   - `npm run demo:https`

   This serves the Angular demo at:
   - `https://localhost:9443/`

   and proxies SigWeb under:
   - `https://localhost:9443/sigweb/*`

4) In your browser, open the root URL once and accept the certificate warning:
   - `https://localhost:9443/`

5) Open the deployed demo:
   - `https://sergkredo.github.io/topaz-demo/`

The demo will call:
- `https://localhost:9443/sigweb/...` (bridge)
which proxies to:
- `http://localhost:47289/sigweb/...` (SigWeb)

## Notes
- The bridge uses a self-signed certificate generated at runtime. You must approve it in the browser once.
- You can change the bridge port:
  - `set BRIDGE_PORT=9443`
- You can change the SigWeb target:
  - `set SIGWEB_TARGET=http://localhost:47289`

## For end users (no repo / no Node)
If you want other users to run the deployed demo without cloning this repo or installing Node.js:

1) Build the bridge EXE on your machine:
   - `npm install`
   - `npm run bridge:build-exe`

2) Publish `bridge/dist/topaz-demo-bridge.exe` as a downloadable file (e.g. GitHub Releases).

3) End users then only need to:
   - Install and start SigWeb
   - Run `topaz-demo-bridge.exe`
   - Open `https://localhost:9443/` once and approve the certificate warning
   - Open `https://sergkredo.github.io/topaz-demo/`
