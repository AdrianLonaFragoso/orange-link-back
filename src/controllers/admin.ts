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

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = (req.cookies?.admin_token as string | undefined) || (req.headers.authorization?.replace(/^Bearer\s+/i, '') as string | undefined);
  if (!token) {
    res.status(401).json({ error: 'No autenticado como admin' });
    return;
  }
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token admin inválido o expirado' });
  }
}

export async function verifyAdmin(req: Request, res: Response) {
  const token = (req.cookies?.admin_token as string | undefined) || (req.headers.authorization?.replace(/^Bearer\s+/i, '') as string | undefined);
  if (!token) { res.json({ authenticated: false }); return; }
  try { jwt.verify(token, JWT_SECRET); res.json({ authenticated: true }); } catch { res.json({ authenticated: false }); }
}

export async function listUsersJson(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, status: true, createdAt: true } });
    res.json({ users });
  } catch (err) { next(err); }
}

function wantsJson(req: Request): boolean {
  const accept = req.headers.accept || '';
  const ctype = req.headers['content-type'] || '';
  return accept.includes('application/json') || ctype.includes('application/json') || !!(req as any).is?.('json');
}

// helpers shared with training
function sanitizeUrl(u: any): string | null {
  if (u == null || u === '') return null;
  const s = String(u).trim().slice(0, 2048);
  if (!/^https?:\/\/.+/i.test(s) && !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(s)) return null;
  return s;
}
function sanitizeExercises(exs: any[]): any[] {
  if (!Array.isArray(exs)) return [];
  return exs.map((ex: any) => {
    const imageUrl = sanitizeUrl(ex.imageUrl);
    const imageUrl2 = sanitizeUrl(ex.imageUrl2);
    return {
      id: ex.id || undefined,
      name: String(ex.name || '').slice(0, 120),
      target: Math.max(0, Math.min(999, Number(ex.target) || 0)),
      sets: Math.max(1, Math.min(20, Number(ex.sets) || 1)),
      unit: ['reps','km','min'].includes(ex.unit) ? ex.unit : 'reps',
      muscleGroup: ex.muscleGroup ? String(ex.muscleGroup).slice(0, 40) : undefined,
      weight: ex.weight != null ? Math.max(0, Math.min(500, Number(ex.weight))) : undefined,
      imageUrl,
      imageUrl2,
    };
  }).filter((e:any)=> e.name);
}
function parseCsvToExercises(csvContent: string): any[] {
  const lines = csvContent.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const exercises: any[] = [];
  let headerSkipped = false;
  for (const line of lines) {
    if (!headerSkipped) {
      const isHeader = /nombre/i.test(line) && /target/i.test(line);
      if (isHeader) { headerSkipped = true; continue; }
    }
    headerSkipped = true;
    let parts: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i=0;i<line.length;i++) {
      const ch=line[i];
      if (ch==='"') { inQuote=!inQuote; cur+=ch; }
      else if (ch===',' && !inQuote) { parts.push(cur.trim()); cur=''; }
      else cur+=ch;
    }
    parts.push(cur.trim());
    parts = parts.map(p=>p.trim());
    if (parts.length < 4) continue;
    const name = parts[0].replace(/^"|"$/g,'').replace(/""/g,'"');
    const target = parseInt(parts[1], 10);
    const sets = parseInt(parts[2], 10);
    const unit = ['reps','km','min'].includes(parts[3]) ? parts[3] : 'reps';
    const muscleGroup = parts[4]?.trim() || '';
    const imageUrl = parts[5]?.trim() ? parts[5].trim().slice(0,2048) : null;
    const imageUrl2 = parts[6]?.trim() ? parts[6].trim().slice(0,2048) : null;
    const validImage = imageUrl && (/^https?:\/\/.+/i.test(imageUrl) || /^data:image\//i.test(imageUrl)) ? imageUrl : null;
    const validImage2 = imageUrl2 && (/^https?:\/\/.+/i.test(imageUrl2) || /^data:image\//i.test(imageUrl2)) ? imageUrl2 : null;
    if (name && !isNaN(target) && !isNaN(sets)) {
      const ex: any = { name, target, sets, unit, imageUrl: validImage, imageUrl2: validImage2 };
      if (muscleGroup) ex.muscleGroup = muscleGroup;
      exercises.push(ex);
    }
  }
  return sanitizeExercises(exercises);
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      if (wantsJson(req)) { res.status(401).json({ error: 'Contraseña incorrecta' }); return; }
      res.status(401).json({ error: 'Contraseña incorrecta' }); return;
    }
    const token = generateAdminToken();
    res.cookie('admin_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    if (wantsJson(req)) { res.json({ success: true, token }); return; }
    res.json({ success: true, token });
  } catch (err) { next(err); }
}

export async function logoutAdmin(req: Request, res: Response) {
  res.clearCookie('admin_token');
  if (wantsJson(req)) { res.json({ success: true }); return; }
  res.json({ success: true });
}

export async function approveUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    await prisma.user.update({ where: { id }, data: { status: 'approved' } });
    if (wantsJson(req)) { res.json({ success: true, user: { ...user, status: 'approved' } }); return; }
    res.json({ success: true });
  } catch (err) { next(err); }
}
export async function rejectUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    await prisma.user.update({ where: { id }, data: { status: 'rejected' } });
    if (wantsJson(req)) { res.json({ success: true, user: { ...user, status: 'rejected' } }); return; }
    res.json({ success: true });
  } catch (err) { next(err); }
}
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      if (wantsJson(req)) { res.status(400).json({ error: 'Email y contraseña son requeridos' }); return; }
      res.status(400).json({ error: 'Email y contraseña son requeridos' }); return;
    }
    if (password.length < 4) {
      if (wantsJson(req)) { res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' }); return; }
      res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' }); return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (wantsJson(req)) { res.status(409).json({ error: `El email `+email+` ya está registrado` }); return; }
      res.status(409).json({ error: `El email `+email+` ya está registrado` }); return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({ data: { email, name: name || email.split('@')[0], password: hashedPassword, status: 'approved' } });
    if (wantsJson(req)) { res.json({ success: true, user: { id: created.id, name: created.name, email: created.email, status: created.status } }); return; }
    res.json({ success: true, user: { id: created.id, name: created.name, email: created.email, status: created.status } });
  } catch (err) { next(err); }
}
export async function editUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { name, email, status } = req.body;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (wantsJson(req)) { res.status(409).json({ error: `El email `+email+` ya está en uso` }); return; }
        res.status(409).json({ error: `El email `+email+` ya está en uso` }); return;
      }
    }
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (status !== undefined) data.status = status;
    const updated = await prisma.user.update({ where: { id }, data });
    if (wantsJson(req)) { res.json({ success: true, user: { id: updated.id, name: updated.name, email: updated.email, status: updated.status } }); return; }
    res.json({ success: true, user: { id: updated.id, name: updated.name, email: updated.email, status: updated.status } });
  } catch (err) { next(err); }
}
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    await prisma.user.delete({ where: { id } });
    if (wantsJson(req)) { res.json({ success: true }); return; }
    res.json({ success: true });
  } catch (err) { next(err); }
}

// Global templates
export async function getGlobalTemplates(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.workoutTemplate.findMany({ orderBy: { name: 'asc' } });
    const templates: Record<string, any[]> = {};
    rows.forEach(r => { templates[r.name] = (r.exercises as any[]) || []; });
    res.json({ templates, list: rows.map(r=>({ id:r.id, name:r.name, exercises: r.exercises })) });
  } catch (err) { next(err); }
}
export async function createGlobalTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { templateName, name, exercises, csvContent } = req.body as any;
    const tplName = (templateName || name || '').trim();
    if (!tplName) { res.status(400).json({ error: 'Nombre de plantilla requerido' }); return; }
    let exs: any[] = [];
    if (Array.isArray(exercises) && exercises.length) exs = sanitizeExercises(exercises);
    else if (csvContent) exs = parseCsvToExercises(csvContent);
    else { res.status(400).json({ error: 'Se requieren ejercicios (fila o CSV)' }); return; }
    if (exs.length===0) { res.status(400).json({ error: 'No se pudieron parsear ejercicios' }); return; }
    await prisma.workoutTemplate.upsert({
      where: { name: tplName },
      create: { name: tplName, exercises: exs as any },
      update: { exercises: exs as any },
    });
    const rows = await prisma.workoutTemplate.findMany({ orderBy: { name: 'asc' } });
    const templates: Record<string, any[]> = {};
    rows.forEach(r => { templates[r.name] = (r.exercises as any[]) || []; });
    res.json({ success: true, templates });
  } catch (err) { next(err); }
}
export async function deleteGlobalTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { templateName, name } = req.body as any;
    const tplName = (templateName || name || '').trim();
    if (!tplName) { res.status(400).json({ error: 'templateName requerido' }); return; }
    const existing = await prisma.workoutTemplate.findUnique({ where: { name: tplName } });
    if (!existing) { res.status(404).json({ error: `Plantilla "`+tplName+`" no encontrada` }); return; }
    await prisma.workoutTemplate.delete({ where: { name: tplName } });
    const rows = await prisma.workoutTemplate.findMany({ orderBy: { name: 'asc' } });
    const templates: Record<string, any[]> = {};
    rows.forEach(r => { templates[r.name] = (r.exercises as any[]) || []; });
    res.json({ success: true, templates });
  } catch (err) { next(err); }
}

// Training per user for routine modal
export async function getUserTrainingAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const config = await prisma.trainingConfig.findUnique({ where: { userId } });
    const schedule = (config?.schedule as Record<string, any[]>) || {};
    const restDays = (config?.restDays as string[]) || [];
    const dayLabels = (config?.dayLabels as Record<string,string>) || {};
    const tplRows = await prisma.workoutTemplate.findMany({ orderBy: { name: 'asc' } });
    const templatesMap: Record<string, any[]> = {};
    tplRows.forEach(r=>{ templatesMap[r.name]= (r.exercises as any[])||[]; });
    const legacy = (config?.templates as Record<string, any[]>) || {};
    for (const [k,v] of Object.entries(legacy)) if(!templatesMap[k]) templatesMap[k]=v;
    res.json({ schedule, restDays, dayLabels, templates: templatesMap, intensity: config?.intensity ?? null, endDate: config?.endDate ? config.endDate.toISOString().split('T')[0] : null });
  } catch (err) { next(err); }
}

export async function updateRoutineDay(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const { day, dayLabel, isRest, exercises, csvContent } = req.body as any;
    const validDays = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
    if (!day || !validDays.includes(day)) { res.status(400).json({ error: 'Día inválido. Usa: '+validDays.join(', ') }); return; }
    const config = await prisma.trainingConfig.findUnique({ where: { userId } });
    const currentSchedule = (config?.schedule as Record<string, any[]>) || {};
    const currentRest = (config?.restDays as string[]) || [];
    const currentLabels = (config?.dayLabels as Record<string,string>) || {};
    let newExercises: any[] = [];
    if (isRest) newExercises = [];
    else if (Array.isArray(exercises)) newExercises = sanitizeExercises(exercises);
    else if (csvContent) newExercises = parseCsvToExercises(csvContent);
    else newExercises = [];
    const newSchedule = { ...currentSchedule, [day]: newExercises };
    let newRest: string[] = [...currentRest];
    if (isRest) { if (!newRest.includes(day)) newRest.push(day); }
    else { newRest = newRest.filter(d=>d!==day); }
    const newLabels = { ...currentLabels };
    if (dayLabel !== undefined) {
      if (dayLabel.trim()) newLabels[day]=dayLabel.trim().slice(0,80);
      else delete newLabels[day];
    } else if (isRest) newLabels[day]='Descanso';
    await prisma.trainingConfig.upsert({
      where: { userId },
      create: { userId, intensity: 100, endDate: new Date(Date.now()+30*24*60*60*1000), schedule: newSchedule, restDays: newRest, dayLabels: newLabels },
      update: { schedule: newSchedule, restDays: newRest, dayLabels: newLabels },
    });
    res.json({ success: true, schedule: newSchedule, restDays: newRest, dayLabels: newLabels });
  } catch (err) { next(err); }
}
export async function updateRoutinesBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const { schedule, dayLabels, restDays } = req.body as any;
    const validDays = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
    let cleanSchedule: Record<string, any[]> = {};
    if (schedule && typeof schedule==='object') {
      for (const d of validDays) {
        const exs = schedule[d];
        if (exs!==undefined) cleanSchedule[d]= sanitizeExercises(Array.isArray(exs)? exs : []);
      }
    } else {
      const cfg = await prisma.trainingConfig.findUnique({ where: { userId } });
      cleanSchedule = (cfg?.schedule as any) || {};
      for (const d of validDays) if(cleanSchedule[d]) cleanSchedule[d]=sanitizeExercises(cleanSchedule[d]);
    }
    let cleanRest: string[] = Array.isArray(restDays) ? restDays.filter((d:string)=>validDays.includes(d)) : [];
    let cleanLabels: Record<string,string> = {};
    if (dayLabels && typeof dayLabels==='object') {
      for (const [k,v] of Object.entries(dayLabels)) if(validDays.includes(k) && typeof v==='string' && v.trim()) cleanLabels[k]=String(v).slice(0,80);
    }
    await prisma.trainingConfig.upsert({
      where: { userId },
      create: { userId, intensity: 100, endDate: new Date(Date.now()+30*24*60*60*1000), schedule: cleanSchedule, restDays: cleanRest, dayLabels: cleanLabels },
      update: { schedule: cleanSchedule, restDays: cleanRest, dayLabels: cleanLabels },
    });
    res.json({ success: true, schedule: cleanSchedule, restDays: cleanRest, dayLabels: cleanLabels });
  } catch (err) { next(err); }
}

// Legacy per-user templates (deprecated, proxies to global)
export async function getUserTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.workoutTemplate.findMany({ orderBy: { name: 'asc' } });
    const templates: Record<string, any[]> = {};
    rows.forEach(r => { templates[r.name] = (r.exercises as any[]) || []; });
    const userId = req.params.userId as string;
    const config = await prisma.trainingConfig.findUnique({ where: { userId }, select: { templates: true } });
    const legacy = (config?.templates as Record<string, any[]>) || {};
    for (const [k,v] of Object.entries(legacy)) if(!templates[k]) templates[k]=v;
    res.json({ templates });
  } catch (err) { next(err); }
}
export async function uploadTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { templateName, csvContent, exercises } = req.body as any;
    if (!templateName) { res.status(400).json({ error: 'templateName requerido' }); return; }
    let exs: any[] = [];
    if (Array.isArray(exercises)) exs = sanitizeExercises(exercises);
    else if (csvContent) exs = parseCsvToExercises(csvContent);
    else { res.status(400).json({ error: 'templateName y csvContent/exercises requeridos' }); return; }
    if (exs.length===0) { res.status(400).json({ error: 'No se pudieron parsear ejercicios' }); return; }
    await prisma.workoutTemplate.upsert({
      where: { name: templateName },
      create: { name: templateName, exercises: exs as any },
      update: { exercises: exs as any },
    });
    const rows = await prisma.workoutTemplate.findMany({ orderBy: { name: 'asc' } });
    const templates: Record<string, any[]> = {};
    rows.forEach(r => { templates[r.name] = (r.exercises as any[]) || []; });
    res.json({ success: true, templates });
  } catch (err) { next(err); }
}
export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { templateName } = req.body as any;
    if (!templateName) { res.status(400).json({ error: 'templateName es requerido' }); return; }
    const existing = await prisma.workoutTemplate.findUnique({ where: { name: templateName } });
    if (!existing) { res.status(404).json({ error: `Plantilla "`+templateName+`" no encontrada` }); return; }
    await prisma.workoutTemplate.delete({ where: { name: templateName } });
    const rows = await prisma.workoutTemplate.findMany({ orderBy: { name: 'asc' } });
    const templates: Record<string, any[]> = {};
    rows.forEach(r => { templates[r.name] = (r.exercises as any[]) || []; });
    res.json({ success: true, templates });
  } catch (err) { next(err); }
}
export async function assignTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const { day, templateName } = req.body;
    const validDays = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
    if (!day || !validDays.includes(day)) { res.status(400).json({ error: 'Día inválido. Usa: ' + validDays.join(', ') }); return; }
    if (!templateName) { res.status(400).json({ error: 'templateName es requerido' }); return; }
    let tpl = await prisma.workoutTemplate.findUnique({ where: { name: templateName } });
    let exercises: any[] | null = tpl ? (tpl.exercises as any[]) : null;
    if (!exercises) {
      const config = await prisma.trainingConfig.findUnique({ where: { userId } });
      const legacy = (config?.templates as Record<string, any[]>) || {};
      exercises = legacy[templateName] || null;
    }
    if (!exercises) { res.status(404).json({ error: `Plantilla "`+templateName+`" no encontrada` }); return; }
    const sanitized = sanitizeExercises(exercises);
    const config = await prisma.trainingConfig.findUnique({ where: { userId } });
    const currentSchedule = (config?.schedule as Record<string, any[]>) || {};
    const newSchedule = { ...currentSchedule, [day]: sanitized };
    const currentRest = (config?.restDays as string[]) || [];
    const newRest = currentRest.filter((d: string) => d !== day);
    const currentLabels = (config?.dayLabels as Record<string,string>) || {};
    const newLabels = { ...currentLabels, [day]: templateName };
    await prisma.trainingConfig.upsert({
      where: { userId },
      create: { userId, intensity: 100, endDate: new Date(Date.now() + 30 * 24*60*60*1000), schedule: newSchedule, restDays: newRest, dayLabels: newLabels },
      update: { schedule: newSchedule, restDays: newRest, dayLabels: newLabels },
    });
    res.json({ success: true, schedule: newSchedule });
  } catch (err) { next(err); }
}
