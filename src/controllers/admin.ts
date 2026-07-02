import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'orangelink-dev-secret';

function generateAdminToken(): string {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

const ADMIN_HTML = (users: any[], message?: string, error?: string) => `<!DOCTYPE html>
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
  .container { max-width: 1060px; margin: 0 auto; padding: 2rem 1rem; }
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
    font-weight: 700;
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
  .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .btn {
    padding: 0.4rem 0.8rem; border: none; border-radius: 8px; font-size: 0.7rem;
    font-weight: 700; cursor: pointer; transition: all 0.15s;
    text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap;
  }
  .btn:hover { transform: scale(0.97); }
  .btn-approve { background: rgba(34,197,94,0.15); color: #22c55e; }
  .btn-approve:hover { background: rgba(34,197,94,0.25); }
  .btn-reject { background: rgba(239,68,68,0.15); color: #ef4444; }
  .btn-reject:hover { background: rgba(239,68,68,0.25); }
.btn-edit { background: rgba(59,130,246,0.15); color: #3b82f6; }
.btn-edit:hover { background: rgba(59,130,246,0.25); }
.btn-templates { background: rgba(245,158,11,0.15); color: #f59e0b; }
.btn-templates:hover { background: rgba(245,158,11,0.25); }
.btn-delete { background: rgba(239,68,68,0.1); color: #ef4444; }
.btn-delete:hover { background: rgba(239,68,68,0.2); }
  .btn-primary {
    background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff;
    padding: 0.6rem 1.2rem; border: none; border-radius: 10px;
    font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .btn-primary:hover { opacity: 0.9; transform: scale(0.98); }
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
    font-size: 0.875rem; font-weight: 600; z-index: 1000; cursor: pointer;
    animation: slideIn 0.3s ease;
  }
  .toast.success { background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; }
  .toast.error { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
  .toast.hiding { animation: slideOut 0.3s ease forwards; }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
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
  .toolbar {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;
  }
  .modal-overlay {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); z-index: 2000; align-items: center; justify-content: center;
  }
  .modal-overlay.active { display: flex; }
  .modal {
    background: #1c1c1e; border-radius: 16px; padding: 2rem; width: 90%; max-width: 440px;
    border: 1px solid rgba(255,255,255,0.06); max-height: 90vh; overflow-y: auto;
  }
  .modal h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
  .modal p.sub { color: #8e8e93; font-size: 0.8rem; margin-bottom: 1.5rem; }
  .modal label {
    display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #8e8e93; margin-bottom: 0.4rem; margin-top: 1rem;
  }
  .modal label:first-of-type { margin-top: 0; }
  .modal input, .modal select {
    width: 100%; padding: 0.7rem 1rem; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1); background: #0f0f13;
    color: #e8e8ed; font-size: 0.95rem;
  }
  .modal input:focus, .modal select:focus { outline: none; border-color: #f59e0b; }
  .modal .btn-row { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .modal .btn-row .btn { flex: 1; padding: 0.7rem; font-size: 0.8rem; }
  .modal .btn-cancel { background: rgba(255,255,255,0.06); color: #8e8e93; }
  .modal .btn-cancel:hover { background: rgba(255,255,255,0.1); }
  .modal .btn-submit { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }
  .modal .btn-submit:hover { opacity: 0.9; }
  .modal .btn-delete-confirm { background: rgba(239,68,68,0.2); color: #ef4444; }
  .modal .btn-delete-confirm:hover { background: rgba(239,68,68,0.3); }
  .modal-error { color: #ef4444; font-size: 0.8rem; margin-top: 0.75rem; text-align: center; }
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
  ${error ? `<div class="toast error">${error}</div>` : ''}

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
    <div class="stat">
      <div class="stat-value">${users.length}</div>
      <div class="stat-label">Total</div>
    </div>
  </div>

  <div class="toolbar">
    <span style="font-size:0.8rem;font-weight:600;color:#8e8e93">${users.length} usuario${users.length !== 1 ? 's' : ''}</span>
    <button class="btn-primary" onclick="openModal('create')">+ Crear usuario</button>
  </div>

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Registro</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${users.length === 0 ? '<tr><td colspan="5" class="empty">No hay usuarios registrados</td></tr>' : ''}
        ${users.map(u => `
        <tr>
          <td><strong>${u.name || '—'}</strong></td>
          <td style="font-size:0.8rem">${u.email}</td>
          <td style="font-size:0.8rem">${new Date(u.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td><span class="badge ${u.status}">${u.status === 'pending' ? 'Pendiente' : u.status === 'approved' ? 'Aprobado' : 'Rechazado'}</span></td>
          <td>
            <div class="actions">
              ${u.status !== 'approved' ? `<form method="POST" action="/admin/approve/${u.id}" style="margin:0"><button class="btn btn-approve" type="submit">Aprobar</button></form>` : ''}
              ${u.status === 'pending' ? `<form method="POST" action="/admin/reject/${u.id}" style="margin:0"><button class="btn btn-reject" type="submit">Rechazar</button></form>` : ''}
              ${u.status !== 'pending' ? `
              <button class="btn btn-edit" onclick='openEdit("${u.id}", ${JSON.stringify(u.name || '')}, ${JSON.stringify(u.email)}, "${u.status}")'>Editar</button>
              <button class="btn btn-templates" onclick='openTemplates("${u.id}", ${JSON.stringify(u.name || u.email)})'>Plantillas</button>
              <button class="btn btn-delete" onclick='openDelete("${u.id}", ${JSON.stringify(u.name || u.email)})'>Eliminar</button>` : ''}
            </div>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Templates Modal -->
<div id="modal-templates" class="modal-overlay" onclick="if(event.target===this)closeModal('templates')">
  <div class="modal" onclick="event.stopPropagation()" style="max-width:560px">
    <h3>Plantillas de entrenamiento</h3>
    <p class="sub" id="templates-user-label">—</p>

    <!-- Current templates list -->
    <div id="templates-list" class="space-y-1" style="margin-bottom:1.5rem"></div>

    <hr style="border-color:rgba(255,255,255,0.06);margin-bottom:1.5rem">

    <!-- Add template form -->
    <h4 style="font-size:0.85rem;font-weight:800;margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.04em">Agregar plantilla</h4>

    <div class="space-y-3">
      <div>
        <label>Nombre de la plantilla</label>
        <input type="text" id="template-name" placeholder="Ej: Brazo y Hombro" />
      </div>
      <div>
        <label>CSV de ejercicios</label>
        <textarea id="template-csv" rows="6" style="width:100%;padding:0.7rem 1rem;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:#0f0f13;color:#e8e8ed;font-size:0.85rem;font-family:monospace;resize:vertical" placeholder="nombre,target,sets,unit,muscle&#10;Curl martillo,15,3,reps,Bíceps&#10;Jalón de tríceps,15,3,reps,Tríceps&#10;Elevaciones laterales,15,3,reps,Hombro"></textarea>
      </div>
      <div>
        <label>O sube un archivo CSV</label>
        <input type="file" id="template-file" accept=".csv" style="width:100%;padding:0.5rem 0;color:#8e8e93;font-size:0.8rem" />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:0.5rem">
        <button class="btn btn-copy" id="btn-copy-format" onclick="copyFormatCSV()" type="button" style="font-size:0.65rem">📋 Copiar formato</button>
        <button class="btn btn-approve" onclick="downloadSampleCSV()" type="button" style="font-size:0.65rem">📄 Descargar CSV de ejemplo</button>
      </div>
      <div id="template-error" class="modal-error" style="display:none"></div>
      <div class="btn-row">
        <button type="button" class="btn btn-cancel" onclick="closeModal('templates')">Cerrar</button>
        <button type="button" class="btn btn-submit" id="btn-submit-template" onclick="submitTemplate()">Cargar plantilla</button>
      </div>
    </div>
  </div>
</div>

<!-- Create Modal -->
<div id="modal-create" class="modal-overlay" onclick="if(event.target===this)closeModal('create')">
  <div class="modal" onclick="event.stopPropagation()">
    <h3>Crear usuario</h3>
    <p class="sub">Los datos se guardarán con estado "Aprobado"</p>
    <form method="POST" action="/admin/create">
      <label>Nombre</label>
      <input type="text" name="name" placeholder="Nombre completo" required />
      <label>Email</label>
      <input type="email" name="email" placeholder="correo@ejemplo.com" required />
      <label>Contraseña</label>
      <input type="password" name="password" placeholder="Mínimo 4 caracteres" minlength="4" required />
      <div class="btn-row">
        <button type="button" class="btn btn-cancel" onclick="closeModal('create')">Cancelar</button>
        <button type="submit" class="btn btn-submit">Crear</button>
      </div>
    </form>
  </div>
</div>

<!-- Edit Modal -->
<div id="modal-edit" class="modal-overlay" onclick="if(event.target===this)closeModal('edit')">
  <div class="modal" onclick="event.stopPropagation()">
    <h3>Editar usuario</h3>
    <p class="sub">Actualiza los datos del usuario</p>
    <form id="edit-form" method="POST" action="">
      <label>Nombre</label>
      <input type="text" name="name" id="edit-name" required />
      <label>Email</label>
      <input type="email" name="email" id="edit-email" required />
      <label>Estado</label>
      <select name="status" id="edit-status">
        <option value="approved">Aprobado</option>
        <option value="pending">Pendiente</option>
        <option value="rejected">Rechazado</option>
      </select>
      <div class="btn-row">
        <button type="button" class="btn btn-cancel" onclick="closeModal('edit')">Cancelar</button>
        <button type="submit" class="btn btn-submit">Guardar</button>
      </div>
    </form>
  </div>
</div>

<!-- Delete Modal -->
<div id="modal-delete" class="modal-overlay" onclick="if(event.target===this)closeModal('delete')">
  <div class="modal" onclick="event.stopPropagation()">
    <h3>Eliminar usuario</h3>
    <p class="sub" id="delete-text">¿Estás seguro de eliminar a <strong></strong>?<br/>Todos sus datos se borrarán permanentemente.</p>
    <form id="delete-form" method="POST" action="">
      <div class="btn-row">
        <button type="button" class="btn btn-cancel" onclick="closeModal('delete')">Cancelar</button>
        <button type="submit" class="btn btn-delete-confirm">Eliminar</button>
      </div>
    </form>
  </div>
</div>

<script>
function openModal(id) { document.getElementById('modal-' + id).classList.add('active'); }
function closeModal(id) { document.getElementById('modal-' + id).classList.remove('active'); }
function openEdit(id, name, email, status) {
  document.getElementById('edit-name').value = name;
  document.getElementById('edit-email').value = email;
  document.getElementById('edit-status').value = status;
  document.getElementById('edit-form').action = '/admin/edit/' + id;
  openModal('edit');
}
function openDelete(id, label) {
  document.querySelector('#delete-text strong').textContent = label;
  document.getElementById('delete-form').action = '/admin/delete/' + id;
  openModal('delete');
}
document.querySelectorAll('.toast').forEach(t => {
  t.addEventListener('click', () => { t.classList.add('hiding'); setTimeout(() => t.remove(), 300); });
  setTimeout(() => { t.classList.add('hiding'); setTimeout(() => t.remove(), 300); }, 4000);
});

// Templates
let currentTplUserId = '';

function openTemplates(userId, label) {
  currentTplUserId = userId;
  document.getElementById('templates-user-label').textContent = 'Usuario: ' + label;
  document.getElementById('template-name').value = '';
  document.getElementById('template-csv').value = '';
  document.getElementById('template-error').style.display = 'none';
  document.getElementById('btn-submit-template').textContent = 'Cargar plantilla';
  loadTemplates(userId);
  openModal('templates');
}

function loadTemplates(userId) {
  fetch('/admin/templates/' + userId + '/json')
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById('templates-list');
      const entries = Object.entries(data.templates || {});
      if (entries.length === 0) {
        list.innerHTML = '<p style="color:#8e8e93;font-size:0.8rem;text-align:center;padding:1rem">No hay plantillas guardadas</p>';
        return;
      }
      list.innerHTML = entries.map(([name, exercises]) => {
        var nameEsc = name.replace(/"/g, '&quot;');
        var exercisesEsc = JSON.stringify(exercises).replace(/"/g, '&quot;');
        return '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);border-radius:10px;padding:0.6rem 0.8rem;margin-bottom:0.4rem">' +
          '<div style="flex:1;min-width:0">' +
            '<strong style="font-size:0.8rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + name + '</strong>' +
            '<span style="font-size:0.7rem;color:#8e8e93">' + exercises.length + ' ejercicio' + (exercises.length !== 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:0.3rem">' +
            '<button class="btn btn-edit tpl-edit" data-tplname="' + nameEsc + '" data-tpl-exercises="' + exercisesEsc + '" style="padding:0.3rem 0.6rem;font-size:0.65rem">Editar</button>' +
            '<button class="btn btn-delete tpl-del" data-tplname="' + nameEsc + '" style="padding:0.3rem 0.6rem;font-size:0.65rem">Eliminar</button>' +
          '</div>' +
        '</div>';
      }).join('');
      list.querySelectorAll('.tpl-del').forEach(function(btn) {
        btn.addEventListener('click', function() { deleteTemplate(userId, btn.getAttribute('data-tplname')); });
      });
      list.querySelectorAll('.tpl-edit').forEach(function(btn) {
        btn.addEventListener('click', function() { editTemplate(btn); });
      });
    })
    .catch(function() {
      document.getElementById('templates-list').innerHTML = '<p style="color:#ef4444;font-size:0.8rem;text-align:center;padding:1rem">Error al cargar plantillas</p>';
    });
}

document.getElementById('template-file')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    document.getElementById('template-csv').value = ev.target.result;
  };
  reader.readAsText(file);
});

function submitTemplate() {
  const name = document.getElementById('template-name').value.trim();
  const csv = document.getElementById('template-csv').value.trim();
  const errEl = document.getElementById('template-error');

  if (!name) { errEl.textContent = 'El nombre de la plantilla es requerido'; errEl.style.display = 'block'; return; }
  if (!csv) { errEl.textContent = 'El CSV de ejercicios es requerido'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';

  fetch('/admin/templates/' + currentTplUserId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateName: name, csvContent: csv }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        errEl.textContent = data.error;
        errEl.style.display = 'block';
        return;
      }
      document.getElementById('template-name').value = '';
      document.getElementById('template-csv').value = '';
      loadTemplates(currentTplUserId);
    })
    .catch(() => {
      errEl.textContent = 'Error al subir la plantilla';
      errEl.style.display = 'block';
    });
}

function deleteTemplate(userId, name) {
  fetch('/admin/templates/' + userId + '/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateName: name }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        document.getElementById('template-error').textContent = data.error;
        document.getElementById('template-error').style.display = 'block';
        return;
      }
      loadTemplates(currentTplUserId);
    })
    .catch(() => {
      document.getElementById('template-error').textContent = 'Error al eliminar la plantilla';
      document.getElementById('template-error').style.display = 'block';
    });
}

function editTemplate(btn) {
  var name = btn.getAttribute('data-tplname');
  var exercisesJson = btn.getAttribute('data-tpl-exercises');
  if (!exercisesJson) return;
  try {
    var exercises = JSON.parse(exercisesJson);
  } catch(e) { return; }

  document.getElementById('template-name').value = name;
  document.getElementById('btn-submit-template').textContent = 'Actualizar plantilla';

  var header = 'nombre,target,sets,unit,muscle';
  var rows = exercises.map(function(ex) {
    var muscle = ex.muscleGroup || '';
    return ex.name + ',' + ex.target + ',' + ex.sets + ',' + ex.unit + ',' + muscle;
  });
  document.getElementById('template-csv').value = header + '\\n' + rows.join('\\n');

  document.querySelector('.space-y-3').scrollIntoView({ behavior: 'smooth' });
}

function downloadSampleCSV() {
  const csv = 'nombre,target,sets,unit,muscle\\nCurl martillo,15,3,reps,Bíceps\\nJalón de tríceps en polea,15,3,reps,Tríceps\\nElevaciones laterales,15,3,reps,Hombro\\nPress de banca con mancuernas,12,4,reps,Pecho\\nRemo en polea,12,4,reps,Espalda\\nSentadilla asistida,15,3,reps,Pierna';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_ejemplo.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function copyFormatCSV() {
  const csv = 'nombre,target,sets,unit,muscle\\nCurl martillo,15,3,reps,Bíceps\\nJalón de tríceps en polea,15,3,reps,Tríceps';
  navigator.clipboard.writeText(csv).catch(function() {});
  var btn = document.getElementById('btn-copy-format');
  var orig = btn.textContent;
  btn.textContent = '✓ Copiado';
  setTimeout(function() { btn.textContent = orig; }, 2000);
}
</script>
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

export function getAdmin(req: Request, res: Response) {
  const token = req.cookies?.admin_token as string | undefined;
  if (!token) {
    res.send(LOGIN_HTML());
    return;
  }
  try {
    jwt.verify(token, JWT_SECRET);
    const message = typeof req.query.message === 'string' ? req.query.message : undefined;
    const error = typeof req.query.error === 'string' ? req.query.error : undefined;
    renderDashboard(res, message, error);
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
    res.redirect('/admin');
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
    res.redirect('/admin?message=' + encodeURIComponent(`Usuario ${user.email} aprobado correctamente`));
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
    res.redirect('/admin?message=' + encodeURIComponent(`Usuario ${user.email} rechazado`));
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.redirect('/admin?error=' + encodeURIComponent('Email y contraseña son requeridos'));
    }
    if (password.length < 4) {
      return res.redirect('/admin?error=' + encodeURIComponent('La contraseña debe tener al menos 4 caracteres'));
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.redirect('/admin?error=' + encodeURIComponent(`El email ${email} ya está registrado`));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        status: 'approved',
      },
    });

    res.redirect('/admin?message=' + encodeURIComponent(`Usuario ${email} creado correctamente`));
  } catch (err) {
    next(err);
  }
}

export async function editUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { name, email, status } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.redirect('/admin?error=' + encodeURIComponent(`El email ${email} ya está en uso`));
      }
    }

    const data: { name?: string; email?: string; status?: string } = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (status !== undefined) data.status = status;

    await prisma.user.update({ where: { id }, data });

    res.redirect('/admin?message=' + encodeURIComponent(`Usuario ${email || user.email} actualizado correctamente`));
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    await prisma.user.delete({ where: { id } });

    res.redirect('/admin?message=' + encodeURIComponent(`Usuario ${user.email} eliminado correctamente`));
  } catch (err) {
    next(err);
  }
}

export async function getUserTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const config = await prisma.trainingConfig.findUnique({
      where: { userId },
      select: { templates: true },
    });
    res.json({ templates: config?.templates ?? {} });
  } catch (err) {
    next(err);
  }
}

export async function uploadTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const { templateName, csvContent } = req.body;

    if (!templateName || !csvContent) {
      res.status(400).json({ error: 'templateName y csvContent son requeridos' });
      return;
    }

    const lines = csvContent.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const exercises: { name: string; target: number; sets: number; unit: string; muscleGroup?: string }[] = [];
    let headerSkipped = false;

    for (const line of lines) {
      if (!headerSkipped) {
        const isHeader = /nombre/i.test(line) && /target/i.test(line);
        if (isHeader) { headerSkipped = true; continue; }
      }
      headerSkipped = true;

      const parts = line.split(',').map((p: string) => p.trim());
      if (parts.length < 4) continue;

      const name = parts[0];
      const target = parseInt(parts[1], 10);
      const sets = parseInt(parts[2], 10);
      const unit = ['reps', 'km', 'min'].includes(parts[3]) ? parts[3] : 'reps';
      const muscleGroup = parts[4]?.trim() || '';

      if (name && !isNaN(target) && !isNaN(sets)) {
        const exercise: any = { name, target, sets, unit: unit as 'reps' | 'km' | 'min' };
        if (muscleGroup) exercise.muscleGroup = muscleGroup;
        exercises.push(exercise);
      }
    }

    if (exercises.length === 0) {
      res.status(400).json({ error: 'No se pudieron parsear ejercicios del CSV' });
      return;
    }

    const config = await prisma.trainingConfig.findUnique({ where: { userId } });
    const currentTemplates = (config?.templates as Record<string, any[]>) || {};
    const updatedTemplates = { ...currentTemplates, [templateName]: exercises };

    await prisma.trainingConfig.upsert({
      where: { userId },
      create: {
        userId,
        intensity: 100,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        templates: updatedTemplates,
      },
      update: { templates: updatedTemplates },
    });

    res.json({ success: true, templates: updatedTemplates });
  } catch (err) {
    next(err);
  }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const { templateName } = req.body;

    if (!templateName) {
      res.status(400).json({ error: 'templateName es requerido' });
      return;
    }

    const config = await prisma.trainingConfig.findUnique({ where: { userId } });
    const currentTemplates = (config?.templates as Record<string, any[]>) || {};

    if (!currentTemplates[templateName]) {
      res.status(404).json({ error: `Plantilla "${templateName}" no encontrada` });
      return;
    }

    const updatedTemplates = { ...currentTemplates };
    delete updatedTemplates[templateName];

    if (config) {
      await prisma.trainingConfig.update({
        where: { userId },
        data: { templates: updatedTemplates },
      });
    }

    res.json({ success: true, templates: updatedTemplates });
  } catch (err) {
    next(err);
  }
}

async function renderDashboard(res: Response, message?: string, error?: string) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });
  res.send(ADMIN_HTML(users, message, error));
}
