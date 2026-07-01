import { db } from "./index";
import { exerciseCategories, exercises, users, rewards } from "./schema";

import { hash } from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  await db.delete(exercises);
  await db.delete(exerciseCategories);

  const categoryData = [
    { name: "Chest", description: "Ejercicios de pecho", tierPlastic: "0", tierBronze: "40", tierGold: "60", tierPlatinum: "80", tierEmerald: "100", tierDiamond: "120", tierChallenger: "140" },
    { name: "Back", description: "Ejercicios de espalda", tierPlastic: "0", tierBronze: "50", tierGold: "75", tierPlatinum: "100", tierEmerald: "130", tierDiamond: "160", tierChallenger: "190" },
    { name: "Legs", description: "Ejercicios de piernas", tierPlastic: "0", tierBronze: "60", tierGold: "90", tierPlatinum: "120", tierEmerald: "160", tierDiamond: "200", tierChallenger: "240" },
    { name: "Shoulders", description: "Ejercicios de hombros", tierPlastic: "0", tierBronze: "25", tierGold: "40", tierPlatinum: "55", tierEmerald: "70", tierDiamond: "85", tierChallenger: "100" },
    { name: "Arms", description: "Ejercicios de brazos", tierPlastic: "0", tierBronze: "20", tierGold: "30", tierPlatinum: "45", tierEmerald: "60", tierDiamond: "75", tierChallenger: "90" },
    { name: "Core", description: "Ejercicios de abdomen", tierPlastic: "0", tierBronze: "10", tierGold: "20", tierPlatinum: "35", tierEmerald: "50", tierDiamond: "65", tierChallenger: "80" },
  ];

  for (const cat of categoryData) {
    const [category] = await db.insert(exerciseCategories).values(cat).returning();

    const exerciseNames: Record<string, string[]> = {
      Chest: ["Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Flyes", "Cable Crossover"],
      Back: ["Deadlift", "Pull-Up", "Barbell Row", "Lat Pulldown", "Seated Cable Row"],
      Legs: ["Squat", "Front Squat", "Leg Press", "Romanian Deadlift", "Bulgarian Split Squat"],
      Shoulders: ["Overhead Press", "Lateral Raise", "Front Raise", "Face Pull", "Arnold Press"],
      Arms: ["Barbell Curl", "Tricep Pushdown", "Hammer Curl", "Skull Crusher", "Concentration Curl"],
      Core: ["Plank", "Cable Crunch", "Hanging Leg Raise", "Russian Twist", "Ab Wheel Rollout"],
    };

    const exercisesForCat = exerciseNames[cat.name] || [];
    for (const name of exercisesForCat) {
      await db.insert(exercises).values({
        categoryId: category.id,
        name,
        description: `Ejercicio de ${cat.name.toLowerCase()}`,
      });
    }
  }

  // Create demo user (skip if exists)
  const existingUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.username, "demo"),
  });

  if (!existingUser) {
    const passwordHash = await hash("demo1234", 12);
    await db.insert(users).values({
      username: "demo",
      email: "demo@grank.com",
      passwordHash,
      sex: "MALE",
      weightKg: "80",
      displayName: "Usuario Demo",
    });
    console.log("Demo user created");
  } else {
    console.log("Demo user already exists, skipping");
  }

  // --- Rewards ---
  await db.delete(rewards);

  const rewardData = [
    // Insignias (BADGE)
    { name: "Novato en Forma", description: "Primer PR registrado en GRank", type: "BADGE", costCoins: 0, assetValue: "🏅", milestoneKey: "FIRST_PR" },
    { name: "Guerrero del Hierro", description: "Supera 100 kg en cualquier ejercicio", type: "BADGE", costCoins: 0, assetValue: "⚔️", milestoneKey: "WEIGHT_100KG" },
    { name: "Élite del Gimnasio", description: "Alcanza el rango Diamond", type: "BADGE", costCoins: 0, assetValue: "💎", milestoneKey: "DIAMOND_TIER" },
    { name: "Campeón Invicto", description: "Gana 10 retos consecutivos", type: "BADGE", costCoins: 0, assetValue: "🏆", milestoneKey: "CONSECUTIVE_WINS_10" },
    // Marcos de avatar (AVATAR_FRAME)
    { name: "Marco Llamas", description: "Un marco ardiente para tu avatar", type: "AVATAR_FRAME", costCoins: 100, assetValue: "🔥" },
    { name: "Marco Eléctrico", description: "Tu avatar con una aura de rayos", type: "AVATAR_FRAME", costCoins: 200, assetValue: "⚡" },
    { name: "Marco Cósmico", description: "El universo rodea tu avatar", type: "AVATAR_FRAME", costCoins: 400, assetValue: "🌌" },
    // Títulos (TITLE)
    { name: "La Bestia", description: "Para quienes levantan más que todos", type: "TITLE", costCoins: 75, assetValue: "La Bestia" },
    { name: "Máquina de Guerra", description: "Entrenamiento sin descanso", type: "TITLE", costCoins: 250, assetValue: "Máquina de Guerra" },
    { name: "Leyenda Viviente", description: "El título más codiciado de GRank", type: "TITLE", costCoins: 500, assetValue: "Leyenda Viviente" },
  ];

  for (const r of rewardData) {
    await db.insert(rewards).values(r);
  }
  console.log("Rewards seeded!");

  console.log("Seed completed!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
