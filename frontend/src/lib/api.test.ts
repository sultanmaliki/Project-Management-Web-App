import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AUTH_EXPIRED_EVENT, errorMessage, http, tokenStore } from "./api";

function axiosError(status: number | null, data?: unknown, url = "/projects"): AxiosError {
  return {
    isAxiosError: true,
    config: { url } as InternalAxiosRequestConfig,
    response: status === null ? undefined : { status, data },
  } as AxiosError;
}

describe("errorMessage", () => {
  it("uses a string detail from the API", () => {
    expect(errorMessage(axiosError(409, { detail: "Email already registered" }))).toBe("Email already registered");
  });

  it("summarises FastAPI validation errors with the field name", () => {
    const detail = [{ loc: ["body", "password"], msg: "Value error, Password must not be blank" }];
    expect(errorMessage(axiosError(422, { detail }))).toBe("password: Password must not be blank");
  });

  it("reports an unreachable server", () => {
    expect(errorMessage(axiosError(null))).toMatch(/cannot reach the server/i);
  });

  it("explains rate limiting", () => {
    expect(errorMessage(axiosError(429, {}))).toMatch(/too many/i);
  });

  it("falls back for unknown shapes and non-HTTP errors without leaking them", () => {
    expect(errorMessage(new Error("secret stack trace"), "Nope")).toBe("Nope");
    expect(errorMessage(axiosError(500, "<html>boom</html>"), "Nope")).toBe("Nope");
    expect(errorMessage(undefined)).toMatch(/something went wrong/i);
  });
});

describe("tokenStore", () => {
  it("round-trips and clears", () => {
    tokenStore.set("abc");
    expect(tokenStore.get()).toBe("abc");
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });
});

describe("http interceptors", () => {
  // Run the request interceptor without a network round trip.
  const runRequest = async () => {
    const handlers = (http.interceptors.request as unknown as { handlers: { fulfilled: (c: unknown) => unknown }[] }).handlers;
    const config = { headers: new (await import("axios")).AxiosHeaders() };
    return (await handlers[0].fulfilled(config)) as { headers: { get(name: string): unknown } };
  };
  const runResponseError = (error: AxiosError) => {
    const handlers = (http.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }).handlers;
    return handlers[0].rejected(error);
  };

  it("attaches the bearer token when signed in and nothing otherwise", async () => {
    expect((await runRequest()).headers.get("Authorization")).toBeUndefined();
    tokenStore.set("tok123");
    expect((await runRequest()).headers.get("Authorization")).toBe("Bearer tok123");
  });

  it("clears the session and announces expiry on a 401", async () => {
    tokenStore.set("stale");
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    await expect(runResponseError(axiosError(401, { detail: "Not authenticated" }))).rejects.toBeDefined();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
    expect(tokenStore.get()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does NOT treat a failed login attempt as an expired session", async () => {
    tokenStore.set("still-valid");
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    await expect(runResponseError(axiosError(401, {}, "/auth/login"))).rejects.toBeDefined();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
    expect(tokenStore.get()).toBe("still-valid");
    expect(listener).not.toHaveBeenCalled();
  });

  it("leaves the session alone for other errors", async () => {
    tokenStore.set("keep");
    await expect(runResponseError(axiosError(403, { detail: "nope" }))).rejects.toBeDefined();
    expect(tokenStore.get()).toBe("keep");
  });
});
