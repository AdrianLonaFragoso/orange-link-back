import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'orangelink-dev-secret';

function generateAdminToken(): string {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

const ADMIN_HTML = (users: any[], message?: string) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orange Link — Admin</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f13;
    color: #e8e8ed;
    min-height: 100vh;
  }
  .container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
  h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; letter-spacing: -0.02em; }
  .subtitle { color: #8e8e93; font-size: 0.875rem; margin-bottom: 2rem; }
  .stats { display: flex; gap: 0.75rem; margin-bottom: 2rem; }
  .stat {
    flex: 1; background: #1c1c1e; border-radius: 12px; padding: 1rem; text-align: center;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .stat-value { font-size: 1.75rem; font-weight: 800; }
  .stat-label { font-size: 0.75rem; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
  .stat.pending .stat-value { color: #f59e0b; }
  .stat.approved .stat-value { color: #22c55e; }
  .stat.rejected .stat-value { color: #ef4444; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  th {
    text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: #8e8e93; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  td {
    padding: 0.75rem 1rem; font-size: 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
  }
  tr:hover td { background: rgba(255,255,255,0.02); }
  .badge {
    display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem;
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .badge.pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
  .badge.approved { background: rgba(34,197,94,0.15); color: #22c55e; }
  .badge.rejected { background: rgba(239,68,68,0.15); color: #ef4444; }
  .actions { display: flex; gap: 0.5rem; }
  .btn {
    padding: 0.4rem 1rem; border: none; border-radius: 8px; font-size: 0.75rem;
    font-weight: 700; cursor: pointer; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.03em;
  }
  .btn:hover { transform: scale(0.97); }
  .btn-approve { background: rgba(34,197,94,0.15); color: #22c55e; }
  .btn-approve:hover { background: rgba(34,197,94,0.25); }
  .btn-reject { background: rgba(239,68,68,0.15); color: #ef4444; }
  .btn-reject:hover { background: rgba(239,68,68,0.25); }
  .btn-danger {
    background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.5rem 1.25rem;
    border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; font-size: 0.8rem;
    font-weight: 700; cursor: pointer; transition: all 0.15s;
  }
  .btn-danger:hover { background: rgba(239,68,68,0.2); }
  .card {
    background: #1c1c1e; border-radius: 16px; padding: 1.5rem;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .toast {
    position: fixed; top: 1rem; right: 1rem; padding: 0.75rem 1.25rem; border-radius: 10px;
    font-size: 0.875rem; font-weight: 600; z-index: 100;
    animation: slideIn 0.3s ease;
  }
  .toast.success { background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; }
  .toast.error { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .empty { text-align: center; padding: 3rem; color: #8e8e93; }
  .login-box {
    max-width: 360px; margin: 4rem auto; background: #1c1c1e; border-radius: 16px;
    padding: 2rem; border: 1px solid rgba(255,255,255,0.06);
  }
  .login-box h2 { margin-bottom: 1.5rem; text-align: center; }
  .login-box input {
    width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
    background: #0f0f13; color: #e8e8ed; font-size: 1rem; margin-bottom: 1rem;
  }
  .login-box input:focus { outline: none; border-color: #f59e0b; }
  .login-box button {
    width: 100%; padding: 0.75rem; border: none; border-radius: 10px;
    background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff;
    font-weight: 700; font-size: 1rem; cursor: pointer;
  }
  .login-box button:hover { opacity: 0.9; }
  .login-error { color: #ef4444; font-size: 0.8rem; text-align: center; margin-bottom: 1rem; }
  .header-bar {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header-bar">
    <div>
      <h1>🟠 Orange Link</h1>
      <p class="subtitle">Panel de administración</p>
    </div>
    <form method="POST" action="/admin/logout" style="margin:0">
      <button class="btn-danger" type="submit">Cerrar sesión</button>
    </form>
  </div>

  ${message ? `<div class="toast success">${message}</div>` : ''}

  <div class="stats">
    <div class="stat pending">
      <div class="stat-value">${users.filter(u => u.status === 'pending').length}</div>
      <div class="stat-label">Pendientes</div>
    </div>
    <div class="stat approved">
      <div class="stat-value">${users.filter(u => u.status === 'approved').length}</div>
      <div class="stat-label">Aprobados</div>
    </div>
    <div class="stat rejected">
      <div class="stat-value">${users.filter(u => u.status === 'rejected').length}</div>
      <div class="stat-label">Rechazados</div>
    </div>
  </div>

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Registro</th>
          <th>Estado</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        ${users.length === 0 ? '<tr><td colspan="5" class="empty">No hay usuarios registrados</td></tr>' : ''}
        ${users.map(u => `
        <tr>
          <td><strong>${u.name || '—'}</strong></td>
          <td>${u.email}</td>
          <td>${new Date(u.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td><span class="badge ${u.status}">${u.status === 'pending' ? 'Pendiente' : u.status === 'approved' ? 'Aprobado' : 'Rechazado'}</span></td>
          <td>
            <div class="actions">
              ${u.status !== 'approved' ? `<form method="POST" action="/admin/approve/${u.id}" style="margin:0"><button class="btn btn-approve" type="submit">Aprobar</button></form>` : ''}
              ${u.status !== 'rejected' ? `<form method="POST" action="/admin/reject/${u.id}" style="margin:0"><button class="btn btn-reject" type="submit">Rechazar</button></form>` : ''}
            </div>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</div>
</body>
</html>`;

const LOGIN_HTML = (error?: string) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orange Link — Admin Login</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f13; color: #e8e8ed; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
  }
  .login-box {
    max-width: 360px; width: 100%; margin: 2rem; background: #1c1c1e; border-radius: 16px;
    padding: 2rem; border: 1px solid rgba(255,255,255,0.06);
  }
  .login-box h1 { font-size: 1.25rem; text-align: center; margin-bottom: 0.5rem; }
  .login-box p { color: #8e8e93; font-size: 0.8rem; text-align: center; margin-bottom: 1.5rem; }
  .login-box input {
    width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
    background: #0f0f13; color: #e8e8ed; font-size: 1rem; margin-bottom: 1rem;
  }
  .login-box input:focus { outline: none; border-color: #f59e0b; }
  .login-box button {
    width: 100%; padding: 0.75rem; border: none; border-radius: 10px;
    background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff;
    font-weight: 700; font-size: 1rem; cursor: pointer;
  }
  .login-box button:hover { opacity: 0.9; }
  .error { color: #ef4444; font-size: 0.8rem; text-align: center; margin-bottom: 1rem; }
</style>
</head>
<body>
<div class="login-box">
  <h1>🔐 Admin Panel</h1>
  <p>Ingresa la contraseña de administrador</p>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/admin/login">
    <input type="password" name="password" placeholder="Contraseña" autofocus />
    <button type="submit">Acceder</button>
  </form>
</div>
</body>
</html>`;

export function getAdmin(_req: Request, res: Response) {
  const token = _req.cookies?.admin_token as string | undefined;
  if (!token) {
    res.send(LOGIN_HTML());
    return;
  }
  try {
    jwt.verify(token, JWT_SECRET);
    renderDashboard(res);
  } catch {
    res.clearCookie('admin_token');
    res.send(LOGIN_HTML());
  }
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      res.send(LOGIN_HTML('Contraseña incorrecta'));
      return;
    }
    const token = generateAdminToken();
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    await renderDashboard(res);
  } catch (err) {
    next(err);
  }
}

export async function logoutAdmin(_req: Request, res: Response) {
  res.clearCookie('admin_token');
  res.send(LOGIN_HTML());
}

export async function approveUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    await prisma.user.update({ where: { id }, data: { status: 'approved' } });
    await renderDashboard(res, `Usuario ${user.email} aprobado correctamente`);
  } catch (err) {
    next(err);
  }
}

export async function rejectUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    await prisma.user.update({ where: { id }, data: { status: 'rejected' } });
    await renderDashboard(res, `Usuario ${user.email} rechazado`);
  } catch (err) {
    next(err);
  }
}

async function renderDashboard(res: Response, message?: string) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });
  res.send(ADMIN_HTML(users, message));
}
