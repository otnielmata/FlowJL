import { describe, expect, it } from "vitest";

const { copywritingGeneratorService } = await import("../src/services/copywriting-generator.service.js");

describe("copywritingGeneratorService", () => {
  it("builds a structured suggestion for the requested format", () => {
    const suggestion = copywritingGeneratorService.generate({
      launch: {
        name: "Lancamento Experts em Escala",
        expert: "Ana Costa",
        product: "Programa Escala Digital"
      },
      format: "EMAIL",
      objective: "Aumentar a taxa de resposta",
      briefing: "Precisamos aquecer a base com uma mensagem mais estrategica e orientada ao posicionamento premium.",
      sourceContext: {
        editorialPillars: ["Autoridade", "Clareza de metodo"],
        languageCues: ["sem enrolacao", "direto ao ponto"]
      },
      positioning: {
        centralPromise: "crescimento previsivel com metodo"
      },
      offer: {
        promise: "implementar um processo comercial simples e lucrativo"
      }
    });

    expect(suggestion.headline).toContain("crescimento previsivel com metodo");
    expect(suggestion.hook).toContain("aumentar a taxa de resposta");
    expect(suggestion.bodySections).toHaveLength(3);
    expect(suggestion.reviewNotes).toHaveLength(3);
  });
});
