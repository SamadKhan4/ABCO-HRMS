# ABCO HRMS frontend

Requires Node.js 24.14 or newer. Run commands from this folder.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5180. Start the backend separately on port 4000; Vite proxies `/api` to it.

```sh
npm run build
```

Deploy `dist/` as static files. Configure the same HTTPS origin to proxy `/api/` to the backend. See `../backend/deploy/nginx.conf.example`. `npm start` is a development server.
