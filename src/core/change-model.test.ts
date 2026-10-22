import { describe, expect, it } from "vitest";
import { PROPERTY_LABELS, STYLE_SECTIONS, makeId } from "./change-model";

describe("Vexel change model", () => {
  it("provides labels for every editable property", () => {
    const properties = STYLE_SECTIONS.flatMap((section) => section.properties);
    expect(properties.length).toBeGreaterThan(20);
    expect(new Set(properties).size).toBe(properties.length);
    for (const property of properties) expect(PROPERTY_LABELS[property]).toBeTruthy();
  });
  it("creates distinct change identifiers", () => {
    expect(makeId()).not.toEqual(makeId());
  });
});
