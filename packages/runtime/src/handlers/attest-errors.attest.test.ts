import { describe, expect, it } from "vitest";
import { attestFailure, serverAttestFailure } from "./attest-errors";

describe("attestFailure", () => {
  it("answers an unrecognised request with a fixed sentence", () => {
    expect(attestFailure("refused", "1.48.0")).toEqual({
      ok: false,
      code: "refused",
      error: "Gleam ignored a request it doesn't recognise. Open the link `pnpm scan finish` printed.",
    });
  });

  it("names the release in the release-mismatch sentences", () => {
    expect(attestFailure("release_not_latest", "1.47.0")).toMatchObject({
      ok: false,
      error: expect.stringContaining("v1.47.0 is no longer the latest release"),
    });
    expect(attestFailure("commit_mismatch", "1.47.0")).toMatchObject({
      ok: false,
      error: expect.stringContaining("isn't v1.47.0's tag"),
    });
  });

  it("keeps the detail in the signing-failed sentence, without its trailing period", () => {
    expect(attestFailure("signing_failed", "1.48.0", "The wallet is locked.")).toEqual({
      ok: false,
      code: "signing_failed",
      error: "Gleam couldn't sign the attestation: The wallet is locked. Try again from the link.",
    });
  });
});

describe("serverAttestFailure", () => {
  it("maps a known server code to its fixed sentence and drops the server's own words", () => {
    const result = serverAttestFailure(
      400,
      { code: "challenge_expired", error: "INTERNAL: shard 7 is down" },
      "1.48.0",
    );
    expect(result).toEqual({
      ok: false,
      code: "challenge_expired",
      error:
        "The scan's challenge expired after 72 hours. To start over, ask your agent to run `pnpm scan start` and finish a new scan.",
    });
    expect(result).toMatchObject({ error: expect.not.stringContaining("shard 7") });
  });

  it("keeps an unknown code's sentence only as the server_error detail", () => {
    expect(serverAttestFailure(400, { code: "something_new", error: "Custom server words." }, "1.48.0")).toEqual({
      ok: false,
      code: "server_error",
      error: "The points server refused the attestation: Custom server words. Open the link again later.",
    });
  });

  it("maps 429 and 413 by status", () => {
    expect(serverAttestFailure(429, null, "1.48.0")).toMatchObject({ ok: false, code: "rate_limited" });
    expect(serverAttestFailure(413, null, "1.48.0")).toMatchObject({ ok: false, code: "invalid_attestation" });
  });

  it("falls back to the HTTP status when the body carries no sentence", () => {
    expect(serverAttestFailure(500, null, "1.48.0")).toEqual({
      ok: false,
      code: "server_error",
      error: "The points server refused the attestation: HTTP 500. Open the link again later.",
    });
  });

  it("ignores a non-string code or error", () => {
    expect(serverAttestFailure(500, { code: 42, error: {} }, "1.48.0")).toMatchObject({
      ok: false,
      code: "server_error",
      error: expect.stringContaining("HTTP 500"),
    });
  });
});
