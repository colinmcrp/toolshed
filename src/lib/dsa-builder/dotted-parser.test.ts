import { describe, expect, it } from "vitest";
import { dottedParser } from "./dotted-parser";

describe("dottedParser", () => {
  it("resolves a top-level key", () => {
    const parser = dottedParser("name");
    expect(parser.get({ name: "Edinburgh" })).toBe("Edinburgh");
  });

  it("resolves a dot-notation path", () => {
    const parser = dottedParser("counterparty.legalName");
    expect(parser.get({ counterparty: { legalName: "Edinburgh" } }))
      .toBe("Edinburgh");
  });

  it("returns empty string for a missing path", () => {
    const parser = dottedParser("counterparty.missing");
    expect(parser.get({ counterparty: {} })).toBe("");
  });

  it("returns empty string for null along the path", () => {
    const parser = dottedParser("counterparty.legalName");
    expect(parser.get({ counterparty: null })).toBe("");
  });

  it("returns the scope itself for '.'", () => {
    const parser = dottedParser(".");
    expect(parser.get("self")).toBe("self");
  });
});
