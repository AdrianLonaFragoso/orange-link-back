import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err.message?.substring(0, 200) || 'Unknown database error';
  }

  const status = dbStatus === 'connected' ? 'ok' : 'degraded';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orange Link Backend</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .container { max-width: 600px; width: 100%; }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .card + .card { margin-top: 16px; }
    h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h1 span { color: #F97316; }
    .subtitle {
      color: #888;
      font-size: 13px;
      margin-top: 4px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-ok { background: #16653420; color: #4ade80; border: 1px solid #166534; }
    .badge-degraded { background: #9a341220; color: #fbbf24; border: 1px solid #9a3412; }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .badge-dot.ok { background: #4ade80; }
    .badge-dot.degraded { background: #fbbf24; animation: pulse 1.5s infinite; }
    @keyframes pulse { 50% { opacity: 0.4; } }
    .health-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #2a2a2a;
    }
    .health-label { font-size: 13px; color: #aaa; font-weight: 600; }
    .endpoints {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #2a2a2a;
    }
    .endpoints h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 10px;
    }
    .endpoint {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 13px;
    }
    .method {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      min-width: 40px;
      text-align: center;
    }
    .method.get { background: #1e3a5f; color: #60a5fa; }
    .method.post { background: #3b2f1e; color: #fbbf24; }
    .method.put { background: #1e3b2a; color: #4ade80; }
    .method.delete { background: #3b1e1e; color: #f87171; }
    .endpoint .path { color: #ccc; font-family: monospace; }
    .endpoint .desc { color: #666; font-size: 11px; margin-left: auto; }
    .error-msg {
      margin-top: 12px;
      background: #3b1e1e;
      border: 1px solid #7f1d1d;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: #fca5a5;
      font-family: monospace;
      word-break: break-word;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1><span>●</span> Orange Link</h1>
          <p class="subtitle">Backend API — Health Dashboard</p>
        </div>
        <span class="badge badge-${status}">
          <span class="badge-dot ${status}"></span>
          ${status === 'ok' ? 'Operacional' : 'Degradado'}
        </span>
      </div>

      <div class="health-row">
        <span class="health-label">Base de datos</span>
        <span class="badge badge-${dbStatus === 'connected' ? 'ok' : 'degraded'}">
          <span class="badge-dot ${dbStatus === 'connected' ? 'ok' : 'degraded'}"></span>
          ${dbStatus === 'connected' ? 'Conectada' : dbStatus === 'error' ? 'Error' : 'Desconectada'}
        </span>
      </div>

      ${dbError ? `<div class="error-msg">DB Error: ${dbError}</div>` : ''}

      <div class="health-row">
        <span class="health-label">Servidor</span>
        <span style="font-size:13px;color:#aaa">${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} (CDMX)</span>
      </div>
    </div>

    <div class="card">
      <div class="endpoints">
        <h3>Endpoints API</h3>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/health</span><span class="desc">Estado del servidor</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/dashboard</span><span class="desc">Resumen del dashboard</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/status</span><span class="desc">Últimas medidas corporales</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/status/history</span><span class="desc">Historial de medidas</span></div>
        <div class="endpoint"><span class="method post">POST</span><span class="path">/api/v1/status</span><span class="desc">Nueva medición corporal</span></div>
        <div class="endpoint"><span class="method put">PUT</span><span class="path">/api/v1/status/targets</span><span class="desc">Actualizar objetivos</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/fasting</span><span class="desc">Configuración de ayuno</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/training</span><span class="desc">Configuración de entrenamiento</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/hydration</span><span class="desc">Hidratación del día</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/nutrition/plans</span><span class="desc">Planes de nutrición</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/v1/supplements</span><span class="desc">Lista de suplementos</span></div>
      </div>
    </div>

    <div class="footer">
      Orange Link Backend &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

router.get('/json', async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err.message?.substring(0, 200) || 'Unknown database error';
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: dbStatus,
    databaseError: dbError,
    timestamp: new Date().toISOString(),
    timezone: 'America/Mexico_City',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export default router;
