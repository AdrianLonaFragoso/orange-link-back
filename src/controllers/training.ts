import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

const defaultSchedule: Record<string, any[]> = {
  lunes: [],
  martes: [],
  miercoles: [],
  jueves: [],
  viernes: [],
  sabado: [],
  domingo: [],
};

const defaultTemplates: Record<string, any[]> = {
  "Brazo y Hombro": [
    { name: "Curl martillo", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Jalón de tríceps en polea", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Elevaciones laterales", target: 15, sets: 3, unit: "reps", imageUrl: null },
    {
      name: "Antebrazo (palmas arriba y abajo)",
      target: 25,
      sets: 3,
      unit: "reps",
      imageUrl: null,
    },
    {
      name: "Curl con pausa a mitad del recorrido",
      target: 15,
      sets: 3,
      unit: "reps",
      imageUrl: null,
    },
    { name: "Jalón en polea hacia abajo", target: 15, sets: 3, unit: "reps", imageUrl: null },
    {
      name: 'Dominadas asistidas en banco "L"',
      target: 0,
      sets: 3,
      unit: "reps",
      imageUrl: null,
    },
    { name: "Curl con barra Z", target: 15, sets: 3, unit: "reps", imageUrl: null },
    {
      name: "Tríceps con mancuerna inclinada",
      target: 15,
      sets: 3,
      unit: "reps",
      imageUrl: null,
    },
    { name: "Elevación frontal con disco", target: 15, sets: 3, unit: "reps", imageUrl: null },
  ],
  "Pecho y Espalda": [
    {
      name: "Press de banca con mancuernas",
      target: 15,
      sets: 3,
      unit: "reps",
      imageUrl: null,
    },
    { name: "Remo en polea", target: 15, sets: 3, unit: "reps", imageUrl: null },
    {
      name: "Aperturas en máquina (pec deck)",
      target: 15,
      sets: 3,
      unit: "reps",
      imageUrl: null,
    },
    { name: "Press de banca con barra", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Jalón al pecho en polea", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Jalón tipo chin-up en polea", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Abdomen", target: 15, sets: 3, unit: "reps", imageUrl: null },
   ],
  Pierna: [
    { name: "Extensiones de cuádriceps", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Curl femoral", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Elevación de pantorrillas", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Sentadilla asistida", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Aductores (hacia adentro)", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Abductores (hacia afuera)", target: 15, sets: 3, unit: "reps", imageUrl: null },
    { name: "Prensa de pierna", target: 15, sets: 3, unit: "reps", imageUrl: null },
  ],
};

function getDaysRemaining(endDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const defaultRestDays = ["viernes", "sabado", "domingo"];

const defaultDayLabels: Record<string, string> = {
  lunes: "Brazo y Hombro",
  martes: "Pecho y Espalda",
  miercoles: "Brazo y Hombro",
  jueves: "Pierna",
  viernes: "Descanso",
  sabado: "Descanso",
  domingo: "Descanso",
};

export async function getTraining(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.authUser!.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const config = await prisma.trainingConfig.findUnique({
      where: { userId },
    });

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today },
      update: {},
    });

    const trainingMissions =
      (dailyLog.trainingMissions as Record<string, boolean>) || {};

    res.json({
      intensity: config?.intensity ?? null,
      endDate: config?.endDate
        ? config.endDate.toISOString().split("T")[0]
        : null,
      daysRemaining: config ? getDaysRemaining(config.endDate) : null,
      trainingMissions,
      schedule: config?.schedule ?? null,
      templates: config?.templates ?? null,
      completed: config?.trainingCompleted ?? null,
      exerciseCompleted: config?.trainingExerciseCompleted ?? null,
      restDays: config?.restDays ?? null,
      dayLabels: config?.dayLabels ?? null,
    });
  } catch (err) {
    next(err);
  }
}

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
  });
}

function sanitizeSchedule(schedule: any): Record<string, any[]> | undefined {
  if (schedule == null || typeof schedule !== 'object') return undefined;
  const out: Record<string, any[]> = {};
  for (const [day, exs] of Object.entries(schedule)) {
    out[day] = sanitizeExercises(exs as any[]);
  }
  return out;
}

function sanitizeTemplates(templates: any): Record<string, any[]> | undefined {
  if (templates == null || typeof templates !== 'object') return undefined;
  const out: Record<string, any[]> = {};
  for (const [name, exs] of Object.entries(templates)) {
    out[String(name).slice(0, 80)] = sanitizeExercises(exs as any[]);
  }
  return out;
}

export async function updateTraining(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.authUser!.userId;
    const {
      intensity,
      endDate,
      schedule,
      completed,
      exerciseCompleted,
      templates,
      restDays,
      dayLabels,
    } = req.body;

    if (
      intensity !== undefined &&
      (typeof intensity !== "number" || intensity < 10 || intensity > 100)
    ) {
      throw new AppError(400, "Intensity must be between 10 and 100");
    }

    const cleanSchedule = schedule !== undefined ? sanitizeSchedule(schedule) : undefined;
    const cleanTemplates = templates !== undefined ? sanitizeTemplates(templates) : undefined;

    const data: any = {};
    if (intensity !== undefined) data.intensity = intensity;
    if (endDate) data.endDate = new Date(endDate);
    if (cleanSchedule !== undefined) data.schedule = cleanSchedule;
    if (completed !== undefined) data.trainingCompleted = completed;
    if (exerciseCompleted !== undefined)
      data.trainingExerciseCompleted = exerciseCompleted;
    if (cleanTemplates !== undefined) data.templates = cleanTemplates;
    if (restDays !== undefined) data.restDays = restDays;
    if (dayLabels !== undefined) data.dayLabels = dayLabels;

    const config = await prisma.trainingConfig.upsert({
      where: { userId },
      create: {
        userId,
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 90 * 86400000),
        ...(intensity !== undefined && { intensity }),
        ...(cleanSchedule !== undefined && { schedule: cleanSchedule }),
        ...(cleanTemplates !== undefined && { templates: cleanTemplates }),
        ...(completed !== undefined && { trainingCompleted: completed }),
        ...(exerciseCompleted !== undefined && {
          trainingExerciseCompleted: exerciseCompleted,
        }),
        ...(restDays !== undefined && { restDays }),
        ...(dayLabels !== undefined && { dayLabels }),
      },
      update: data,
    });

    res.json({
      intensity: config.intensity,
      endDate: config.endDate.toISOString().split("T")[0],
      daysRemaining: getDaysRemaining(config.endDate),
      schedule: config.schedule,
      templates: config.templates,
      completed: config.trainingCompleted,
      exerciseCompleted: config.trainingExerciseCompleted,
      restDays: config.restDays,
      dayLabels: config.dayLabels,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleMission(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.authUser!.userId;
    const key = req.params.key as string;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const validKeys = ["squats", "situps", "pushups", "running"];
    if (!validKeys.includes(key)) {
      throw new AppError(400, `Invalid mission key: ${key}`);
    }

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, trainingMissions: { [key]: true } },
      update: {},
    });

    const current =
      (dailyLog.trainingMissions as Record<string, boolean>) || {};
    const newValue = !current[key];

    const updated = await prisma.dailyLog.update({
      where: { userId_date: { userId, date: today } },
      data: {
        trainingMissions: { ...current, [key]: newValue },
      },
    });

    res.json({ trainingMissions: updated.trainingMissions });
  } catch (err) {
    next(err);
  }
}
