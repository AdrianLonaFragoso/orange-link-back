import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultTemplates: Record<string, any[]> = {
  "Brazo y Hombro": [
    { name: "Curl martillo", target: 15, sets: 3, unit: "reps" },
    { name: "Jalón de tríceps en polea", target: 15, sets: 3, unit: "reps" },
    { name: "Elevaciones laterales", target: 15, sets: 3, unit: "reps" },
    {
      name: "Antebrazo (palmas arriba y abajo)",
      target: 25,
      sets: 3,
      unit: "reps",
    },
    {
      name: "Curl con pausa a mitad del recorrido",
      target: 15,
      sets: 3,
      unit: "reps",
    },
    { name: "Jalón en polea hacia abajo", target: 15, sets: 3, unit: "reps" },
    {
      name: 'Dominadas asistidas en banco "L"',
      target: 0,
      sets: 3,
      unit: "reps",
    },
    { name: "Curl con barra Z", target: 15, sets: 3, unit: "reps" },
    {
      name: "Tríceps con mancuerna inclinada",
      target: 15,
      sets: 3,
      unit: "reps",
    },
    { name: "Elevación frontal con disco", target: 15, sets: 3, unit: "reps" },
  ],
  "Pecho y Espalda": [
    {
      name: "Press de banca con mancuernas",
      target: 15,
      sets: 3,
      unit: "reps",
    },
    { name: "Remo en polea", target: 15, sets: 3, unit: "reps" },
    {
      name: "Aperturas en máquina (pec deck)",
      target: 15,
      sets: 3,
      unit: "reps",
    },
    { name: "Press de banca con barra", target: 15, sets: 3, unit: "reps" },
    { name: "Jalón al pecho en polea", target: 15, sets: 3, unit: "reps" },
    { name: "Jalón tipo chin-up en polea", target: 15, sets: 3, unit: "reps" },
    { name: "Abdomen", target: 15, sets: 3, unit: "reps" },
  ],
  Pierna: [
    { name: "Extensiones de cuádriceps", target: 15, sets: 3, unit: "reps" },
    { name: "Curl femoral", target: 15, sets: 3, unit: "reps" },
    { name: "Elevación de pantorrillas", target: 15, sets: 3, unit: "reps" },
    { name: "Sentadilla asistida", target: 15, sets: 3, unit: "reps" },
    { name: "Aductores (hacia adentro)", target: 15, sets: 3, unit: "reps" },
    { name: "Abductores (hacia afuera)", target: 15, sets: 3, unit: "reps" },
    { name: "Prensa de pierna", target: 15, sets: 3, unit: "reps" },
  ],
};

async function main() {
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
