import { db } from "./index";
import { exerciseCategories, exercises, users } from "./schema";
import { hash } from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  await db.delete(exercises);
  await db.delete(exerciseCategories);

  const categoryData = [
    { name: "Chest", description: "Ejercicios de pecho", tierBronze: "40", tierSilver: "60", tierGold: "80", tierPlatinum: "100", tierDiamond: "120" },
    { name: "Back", description: "Ejercicios de espalda", tierBronze: "50", tierSilver: "75", tierGold: "100", tierPlatinum: "130", tierDiamond: "160" },
    { name: "Legs", description: "Ejercicios de piernas", tierBronze: "60", tierSilver: "90", tierGold: "120", tierPlatinum: "160", tierDiamond: "200" },
    { name: "Shoulders", description: "Ejercicios de hombros", tierBronze: "25", tierSilver: "40", tierGold: "55", tierPlatinum: "70", tierDiamond: "85" },
    { name: "Arms", description: "Ejercicios de brazos", tierBronze: "20", tierSilver: "30", tierGold: "45", tierPlatinum: "60", tierDiamond: "75" },
    { name: "Core", description: "Ejercicios de abdomen", tierBronze: "10", tierSilver: "20", tierGold: "35", tierPlatinum: "50", tierDiamond: "65" },
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

  console.log("Seed completed!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
