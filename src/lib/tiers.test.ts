import { describe, it, expect } from "vitest";
import { getTier, type TierThresholds } from "./tiers";

/**
 * Test UNITARIO puro: getTier es una función sin dependencias externas
 * (no toca BD ni red), así que se prueba directamente con distintos pesos.
 */
describe("getTier", () => {
  // Umbrales de ejemplo (similares a la categoría "Chest").
  const category: TierThresholds = {
    tierPlastic: "0",
    tierBronze: "40",
    tierGold: "60",
    tierPlatinum: "80",
    tierEmerald: "100",
    tierDiamond: "120",
    tierChallenger: "140",
  };

  it("devuelve PLASTIC si el peso está por debajo del primer umbral", () => {
    expect(getTier(20, category)).toBe("PLASTIC");
  });

  it("devuelve el tier intermedio correcto según el peso", () => {
    expect(getTier(65, category)).toBe("GOLD");
    expect(getTier(105, category)).toBe("EMERALD");
  });

  it("devuelve CHALLENGER si el peso supera el umbral máximo", () => {
    expect(getTier(200, category)).toBe("CHALLENGER");
  });

  it("incluye el límite exacto del umbral (comparación >=)", () => {
    // 60 es exactamente tierGold -> debe contar como GOLD, no como BRONZE.
    expect(getTier(60, category)).toBe("GOLD");
    expect(getTier(140, category)).toBe("CHALLENGER");
  });

  it("trata un umbral null como 0", () => {
    const sinUmbrales: TierThresholds = {
      tierPlastic: null,
      tierBronze: null,
      tierGold: null,
      tierPlatinum: null,
      tierEmerald: null,
      tierDiamond: null,
      tierChallenger: null,
    };
    // Con todos los umbrales en 0, cualquier peso >= 0 cae en el tier más alto.
    expect(getTier(50, sinUmbrales)).toBe("CHALLENGER");
  });
});
