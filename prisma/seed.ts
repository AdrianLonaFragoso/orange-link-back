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

  const user = await prisma.user.findFirst();

  if (!user) {
    console.log("No users found. Skipping training seed.");
    return;
  }

  const defaultEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.trainingConfig.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      intensity: 100,
      endDate: defaultEnd,
      templates: defaultTemplates,
    },
    update: {
      templates: defaultTemplates,
    },
  });

  console.log(`Training config seeded for user ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
