# Topaz Signature Demo (SigWeb)

This is a small Angular demo that talks to the Topaz **SigWeb** local REST host.

Live site (UI): https://sergkredo.github.io/topaz-demo/

## Prerequisites (Windows)

1) Install and start SigWeb
- SigWeb REST host base URL: `http://localhost:47289/sigweb`
- Quick checks:
	- `http://localhost:47289/sigweb/version`
	- `http://localhost:47289/sigweb/TabletConnectQuery`

Official downloads (Topaz Systems)
- SigWeb SDK page: https://topazsystems.com/sdks/sigweb.html
- SigWeb installer: https://www.topazsystems.com/software/sigweb.exe
- SigWeb certificate installer: https://topazsystems.com/software/sigwebcertinstaller.exe

2) Install drivers for your specific tablet model (if needed)
- SigPlus drivers & installers: https://www.sigpluspro.com/

## How to run the demo

### Option A: Local dev (HTTP) — simplest

This is the original local flow and works well with SigWeb because everything is HTTP on localhost.

```powershell
npm install
npm start
```

Open: `http://localhost:4200/`

### Option B: Use the deployed site (GitHub Pages HTTPS) + local bridge

Browsers block calls from an HTTPS page to `http://localhost` (mixed content), and SigWeb is usually HTTP-only on port `47289`.
To make the deployed site work with local SigWeb, run a local HTTPS bridge on `https://localhost:9443`.

From this repo:

```powershell
npm install
npm run demo:https
```

Then:
- Open `https://localhost:9443/` once and approve the certificate warning
- Open `https://sergkredo.github.io/topaz-demo/`

More details: bridge/README.md

## Bridge executable (for end users without the repo)

End users cannot run `npm run demo:https` without the project folder.
For distribution, you can ship a standalone Windows EXE for the bridge.

Build on your machine:

```powershell
npm install
npm run bridge:build-exe
```

Output:
- `bridge/dist/topaz-demo-bridge.exe`

You can publish this EXE via GitHub Releases and link users to it.
