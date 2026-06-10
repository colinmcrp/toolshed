import { describe, it, expect } from "vitest";
import { gatePrivateArtifact, resolveArtifactPrivacy } from "./private-gate";

describe("resolveArtifactPrivacy", () => {
  it("defaults a fresh publish to public", () => {
    expect(resolveArtifactPrivacy(undefined, null)).toBe(false);
  });

  it("honours an explicit request on a fresh publish", () => {
    expect(resolveArtifactPrivacy(true, null)).toBe(true);
  });

  it("preserves privacy on overwrite when unspecified", () => {
    expect(resolveArtifactPrivacy(undefined, { is_private: true })).toBe(true);
    expect(resolveArtifactPrivacy(undefined, { is_private: false })).toBe(false);
  });

  it("lets an explicit request override the replaced artifact", () => {
    expect(resolveArtifactPrivacy(false, { is_private: true })).toBe(false);
    expect(resolveArtifactPrivacy(true, { is_private: false })).toBe(true);
  });
});

describe("gatePrivateArtifact", () => {
  it("redirects anonymous viewers to login with the page as next", () => {
    expect(gatePrivateArtifact(null, "/secret-page.html")).toEqual({
      action: "redirect",
      location: "/login?next=%2Fsecret-page.html",
    });
  });

  it("preserves bundle asset paths in next", () => {
    expect(gatePrivateArtifact(null, "/bundle/assets/app.css")).toEqual({
      action: "redirect",
      location: "/login?next=%2Fbundle%2Fassets%2Fapp.css",
    });
  });

  it("forbids signed-in users from other domains", () => {
    expect(
      gatePrivateArtifact({ email: "partner@example.com" }, "/secret.html")
    ).toEqual({ action: "forbidden" });
  });

  it("forbids users without an email", () => {
    expect(gatePrivateArtifact({ email: null }, "/secret.html")).toEqual({
      action: "forbidden",
    });
  });

  it("serves to mcrpathways.org users", () => {
    expect(
      gatePrivateArtifact({ email: "colin.adam@mcrpathways.org" }, "/secret.html")
    ).toEqual({ action: "serve" });
  });
});
