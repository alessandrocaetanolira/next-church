// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isOfflineNavigation, offlineNavigationRedirect } from "../lib/offline-navigation";

describe("fallback de navegação offline", () => {
  it("redireciona Flight de uma rota ausente para o documento offline", () => {
    const response = offlineNavigationRedirect(
      new Request("https://church.local/members/123?_rsc=abc", { headers: { RSC: "1" } }),
      () => false,
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://church.local/offline");
  });

  it("preserva o acesso à Bíblia precacheada e remove marcadores Flight", () => {
    const response = offlineNavigationRedirect(
      new Request("https://church.local/bible?_rsc=abc"),
      (url) => url === "https://church.local/bible",
    );
    expect(response.headers.get("Location")).toBe("https://church.local/bible");
  });

  it("classifica documentos, mas nunca API, Flight, assets ou mutações", () => {
    const document = new Request("https://church.local/members");
    Object.defineProperty(document, "destination", { value: "document" });
    expect(isOfflineNavigation(document)).toBe(true);
    for (const request of [
      new Request("https://church.local/api/bible"),
      new Request("https://church.local/members", { headers: { RSC: "1" } }),
      new Request("https://church.local/_next/static/chunk.js"),
      new Request("https://church.local/members", { method: "POST" }),
    ]) expect(isOfflineNavigation(request)).toBe(false);
  });
});
