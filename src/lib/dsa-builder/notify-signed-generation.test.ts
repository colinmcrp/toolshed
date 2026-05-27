import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { notifySignedGeneration } from "./notify-signed-generation";
import type { Intake } from "./schema";

const BASE_INTAKE: Intake = {
  jurisdiction: "Scotland",
  useEnglishLegalSystem: false,
  counterpartyType: "LocalAuthority",
  counterpartyWillSign: true,
  includeCriminalRecord: true,
  includeFundraising: true,
  counterparty: {
    legalName: "City of Edinburgh Council",
    shortName: "Edinburgh",
    address: "Waverley Court, Edinburgh",
    signatoryName: "",
    signatoryPosition: "",
    signatoryDate: "",
    signatoryPlace: "",
    witnessName: "",
    witnessPosition: "",
    witnessDate: "",
    witnessAddress: "",
    repJobTitle: "",
    repAddress: "",
    repEmail: "",
    repPhone: "",
    escalationJobTitle: "",
    escalationAddress: "",
    escalationEmail: "",
    escalationPhone: "",
    coveredSchoolsSites: "All Edinburgh secondary schools",
    legalDescription: "",
    background: "",
  },
  mcr: {
    signatoryName: "Sharon McIntyre",
    signatoryPosition: "Chief Executive Officer",
    signatoryDate: "2026-05-25",
    witnessName: "Colin Adam",
    witnessPosition: "Head of Solutions",
    witnessDate: "2026-05-25",
  },
};

const FIXED_NOW = new Date("2026-05-25T12:00:00Z");

function makeFetch(status = 200): ReturnType<typeof vi.fn> {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => "ok",
  })) as unknown as ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  // Tests below assume production-mode notification behavior. vi.stubEnv
  // mutates process.env safely and is auto-restored by vi.unstubAllEnvs.
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("RESEND_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("notifySignedGeneration", () => {
  it("posts to Resend with subject/body for a non-owner caller", async () => {
    const fetchMock = makeFetch();
    await notifySignedGeneration(
      { userEmail: "someone@mcrpathways.org", intake: BASE_INTAKE },
      { fetch: fetchMock as unknown as typeof fetch, now: () => FIXED_NOW },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    const payload = JSON.parse(init.body as string);
    expect(payload.to).toBe("colin.adam@mcrpathways.org");
    expect(payload.subject).toMatch(/someone@mcrpathways\.org/);
    expect(payload.text).toMatch(/Edinburgh — City of Edinburgh Council/);
    expect(payload.text).toMatch(/Scotland/);
    expect(payload.text).toMatch(/2026-05-25T12:00:00\.000Z/);
  });

  it("does not fire when the caller is the owner", async () => {
    const fetchMock = makeFetch();
    await notifySignedGeneration(
      { userEmail: "colin.adam@mcrpathways.org", intake: BASE_INTAKE },
      { fetch: fetchMock as unknown as typeof fetch, now: () => FIXED_NOW },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fire when userEmail is undefined", async () => {
    const fetchMock = makeFetch();
    await notifySignedGeneration(
      { userEmail: undefined, intake: BASE_INTAKE },
      { fetch: fetchMock as unknown as typeof fetch, now: () => FIXED_NOW },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fire when NODE_ENV is not production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = makeFetch();
    await notifySignedGeneration(
      { userEmail: "someone@mcrpathways.org", intake: BASE_INTAKE },
      { fetch: fetchMock as unknown as typeof fetch, now: () => FIXED_NOW },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not throw and skips fetch when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = makeFetch();
    await expect(
      notifySignedGeneration(
        { userEmail: "someone@mcrpathways.org", intake: BASE_INTAKE },
        { fetch: fetchMock as unknown as typeof fetch, now: () => FIXED_NOW },
      ),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows a fetch failure (network/timeout) and resolves", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("timed out");
    });
    await expect(
      notifySignedGeneration(
        { userEmail: "someone@mcrpathways.org", intake: BASE_INTAKE },
        { fetch: fetchMock as unknown as typeof fetch, now: () => FIXED_NOW },
      ),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sets a fetch timeout via AbortSignal", async () => {
    const fetchMock = makeFetch();
    await notifySignedGeneration(
      { userEmail: "someone@mcrpathways.org", intake: BASE_INTAKE },
      { fetch: fetchMock as unknown as typeof fetch, now: () => FIXED_NOW },
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
