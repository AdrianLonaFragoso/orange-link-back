import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

const NUTRITION_TEMPLATES = [
  { name: 'Keto Full', portions: 0, proteinG: 150, veggieG: 400, description: 'Dieta cetogénica estricta, 0 porciones de carbohidratos' },
  { name: 'Low Carb', portions: 2, proteinG: 130, veggieG: 350, description: 'Baja en carbohidratos, 2 porciones al día' },
  { name: 'Mid Carb', portions: 6, proteinG: 120, veggieG: 300, description: 'Carbohidratos moderados, 6 porciones al día' },
  { name: 'Balance Carb', portions: 12, proteinG: 100, veggieG: 250, description: 'Dieta balanceada, 12 porciones de carbohidratos al día' },
];

async function main() {
  // Seed nutrition plan templates
  for (const template of NUTRITION_TEMPLATES) {
    await prisma.nutritionPlan.upsert({
      where: { name: template.name },
      create: template,
      update: {},
    });
  }
  console.log(`Seeded ${NUTRITION_TEMPLATES.length} nutrition plan templates`);

  // Seed global workout templates (available for all users)
  for (const [name, exercises] of Object.entries(defaultTemplates)) {
    await prisma.workoutTemplate.upsert({
      where: { name },
      create: { name, exercises: exercises as any },
      update: {},
    });
  }
  console.log(`Seeded ${Object.keys(defaultTemplates).length} global workout templates`);

  // Migrate legacy per-user templates into global table (if any)
  try {
    const configs = await prisma.trainingConfig.findMany({ select: { templates: true } });
    const seen = new Set<string>(Object.keys(defaultTemplates));
    for (const c of configs) {
      const tpls = (c.templates as Record<string, any[]>) || {};
      for (const [name, exercises] of Object.entries(tpls)) {
        if (seen.has(name)) continue;
        seen.add(name);
        await prisma.workoutTemplate.upsert({
          where: { name },
          create: { name, exercises: exercises as any },
          update: {},
        });
        console.log(`Migrated legacy template "${name}" to global`);
      }
    }
  } catch (e) {
    console.warn('Legacy workout template migration skipped:', e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
