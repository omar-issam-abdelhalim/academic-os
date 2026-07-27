import { describe, expect, it } from "vitest";
import { classifyTrend } from "./trend";

describe("classifyTrend", () => {
  it("returns insufficient-data with fewer than 4 points", () => {
    expect(classifyTrend([]).trend).toBe("insufficient-data");
    expect(classifyTrend([{ at: "2026-01-01", value: 50 }]).trend).toBe("insufficient-data");
    expect(
      classifyTrend([
        { at: "2026-01-01", value: 50 },
        { at: "2026-01-08", value: 60 },
        { at: "2026-01-15", value: 70 },
      ]).trend,
    ).toBe("insufficient-data");
  });

  it("classifies improving when the second half averages notably higher", () => {
    const points = [
      { at: "2026-01-01", value: 50 },
      { at: "2026-01-08", value: 52 },
      { at: "2026-01-15", value: 70 },
      { at: "2026-01-22", value: 74 },
    ];
    const result = classifyTrend(points);
    expect(result.trend).toBe("improving");
    expect(result.delta).toBeGreaterThan(0);
  });

  it("classifies declining when the second half averages notably lower", () => {
    const points = [
      { at: "2026-01-01", value: 80 },
      { at: "2026-01-08", value: 78 },
      { at: "2026-01-15", value: 60 },
      { at: "2026-01-22", value: 58 },
    ];
    const result = classifyTrend(points);
    expect(result.trend).toBe("declining");
    expect(result.delta).toBeLessThan(0);
  });

  it("classifies stable when the change is smaller than the threshold", () => {
    const points = [
      { at: "2026-01-01", value: 80 },
      { at: "2026-01-08", value: 81 },
      { at: "2026-01-15", value: 82 },
      { at: "2026-01-22", value: 83 },
    ];
    expect(classifyTrend(points).trend).toBe("stable");
  });

  it("sorts out-of-order input chronologically before splitting", () => {
    const points = [
      { at: "2026-01-22", value: 90 },
      { at: "2026-01-01", value: 50 },
      { at: "2026-01-15", value: 85 },
      { at: "2026-01-08", value: 55 },
    ];
    const result = classifyTrend(points);
    expect(result.trend).toBe("improving");
    expect(result.firstHalfAverage).toBeCloseTo(52.5);
    expect(result.secondHalfAverage).toBeCloseTo(87.5);
  });

  it("accepts Date objects as well as ISO strings", () => {
    const points = [
      { at: new Date(2026, 0, 1), value: 50 },
      { at: new Date(2026, 0, 8), value: 50 },
      { at: new Date(2026, 0, 15), value: 90 },
      { at: new Date(2026, 0, 22), value: 90 },
    ];
    expect(classifyTrend(points).trend).toBe("improving");
  });
});
