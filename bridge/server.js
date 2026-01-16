const express = require('express');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const selfsigned = require('selfsigned');
const path = require('path');
const fs = require('fs');

const SIGWEB_TARGET = process.env.SIGWEB_TARGET || 'http://localhost:47289';
const PORT = Number(process.env.BRIDGE_PORT || 9443);

const CERT_PATH =
	process.env.BRIDGE_CERT_PATH || path.join(__dirname, 'certs', 'localhost-cert.pem');
const KEY_PATH =
	process.env.BRIDGE_KEY_PATH || path.join(__dirname, 'certs', 'localhost-key.pem');

const app = express();

const distDir = path.join(__dirname, '..', 'dist', 'topaz-demo');
const indexHtmlPath = path.join(distDir, 'index.html');
const hasBuiltApp = fs.existsSync(indexHtmlPath);

function applyCors(req, res) {
	const origin = req.headers.origin;
	// Reflect origin to satisfy CORS + Private Network Access preflights.
	if (origin) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Vary', 'Origin');
	}
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader(
		'Access-Control-Allow-Headers',
		req.headers['access-control-request-headers'] || 'Content-Type'
	);
	res.setHeader('Access-Control-Max-Age', '600');
	// Chrome Private Network Access (PNA)
	res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

app.use((req, res, next) => {
	applyCors(req, res);
	if (req.method === 'OPTIONS') {
		res.status(204).end();
		return;
	}
	next();
});

app.get('/health', (_req, res) => {
	res.status(200).type('text/plain').send('ok');
});

app.get('/', (_req, res) => {
	if (hasBuiltApp) {
		res.status(200).sendFile(indexHtmlPath);
		return;
	}

	res.status(200).type('text/html').send(`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Topaz Demo Bridge</title>
		<style>
			body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
			code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
			.card { max-width: 820px; border: 1px solid #ddd; border-radius: 12px; padding: 16px 18px; }
			a { color: #0b57d0; }
			ul { margin: 8px 0 0; }
		</style>
	</head>
	<body>
		<div class="card">
			<h1 style="margin: 0 0 8px">Topaz Demo Local HTTPS Bridge</h1>
			<div>Proxy target: <code>${SIGWEB_TARGET}</code></div>
			<div>Proxy prefix: <code>/sigweb</code></div>
			<ul>
				<li><a href="/health">/health</a> (should return <code>ok</code>)</li>
				<li><a href="/sigweb/version">/sigweb/version</a> (proxied SigWeb version)</li>
			</ul>
			<p style="margin: 12px 0 0">
				If you see a certificate warning, approve it once so the deployed demo can call <code>https://localhost:9443</code>.
			</p>
		</div>
	</body>
</html>`);
});

	if (hasBuiltApp) {
		// Serve Angular build output (SPA)
		app.use(express.static(distDir));
		// SPA fallback (do not interfere with /sigweb or /health)
		app.get(/^\/(?!sigweb\/|health$).*/, (_req, res) => {
			res.status(200).sendFile(indexHtmlPath);
		});
	}

// Proxy SigWeb REST host
app.use(
	'/sigweb',
	createProxyMiddleware({
		target: SIGWEB_TARGET,
		changeOrigin: true,
		secure: false,
		pathRewrite: (path) => `/sigweb${path}`,
		logLevel: 'warn',
		onProxyRes: (proxyRes, req, res) => {
			applyCors(req, res);
			// Some browsers cache CORS decisions aggressively.
			proxyRes.headers['cache-control'] = 'no-store';
		}
	})
);

let cert;
let key;

if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
	cert = fs.readFileSync(CERT_PATH);
	key = fs.readFileSync(KEY_PATH);
} else {
	const pems = selfsigned.generate(
		[
			{ name: 'commonName', value: 'localhost' },
			{ name: 'organizationName', value: 'Topaz Demo Local Bridge' }
		],
		{
			days: 365,
			keySize: 2048,
			algorithm: 'sha256',
			extensions: [
				{
					name: 'subjectAltName',
					altNames: [
						{ type: 2, value: 'localhost' },
						{ type: 7, ip: '127.0.0.1' }
					]
				}
			]
		}
	);
	cert = pems.cert;
	key = pems.private;
}

const server = https.createServer({ key, cert }, app);

server.on('error', (err) => {
	if (err && err.code === 'EADDRINUSE') {
		// eslint-disable-next-line no-console
		console.error(`ERROR: Port ${PORT} is already in use.`);
		// eslint-disable-next-line no-console
		console.error(`Close the process using that port, or start the bridge on another port:`);
		// eslint-disable-next-line no-console
		console.error(`  set BRIDGE_PORT=9444`);
		// eslint-disable-next-line no-console
		console.error(`  npm run bridge`);
		// eslint-disable-next-line no-console
		console.error(`Windows helper commands:`);
		// eslint-disable-next-line no-console
		console.error(`  netstat -ano | findstr :${PORT}`);
		// eslint-disable-next-line no-console
		console.error(`  taskkill /PID <pid> /F`);
		process.exit(1);
	}

	throw err;
});

server.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Topaz demo bridge listening: https://localhost:${PORT}`);
	// eslint-disable-next-line no-console
	console.log(`Proxying: https://localhost:${PORT}/sigweb/*  ->  ${SIGWEB_TARGET}/sigweb/*`);
	// eslint-disable-next-line no-console
	console.log(`Health check: https://localhost:${PORT}/health`);
});
