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

For Vercel, select this `frontend/` folder as the project root. `vercel.json` proxies `/api/` to `https://abco-backend-production.up.railway.app` and handles React Router pages. Keep the API client at `/api/v1` so session cookies use the frontend origin. Redeploy Vercel after changing this configuration.

Railway backend variables must include `NODE_ENV=production`, `HOST=0.0.0.0` and `FRONTEND_ORIGIN=https://abco-computers-hrms.vercel.app`, plus the private MongoDB URI and existing encryption/session secrets. Railway supplies `PORT`. Never put backend secrets into Vercel frontend variables. Private document storage requires a persistent Railway volume.
