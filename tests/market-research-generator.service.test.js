import { describe, expect, it } from "vitest";

const { marketResearchGeneratorService } = await import("../src/services/market-research-generator.service.js");

describe("marketResearchGeneratorService.generate", () => {
  it("returns a structured research payload with strategic sections", () => {
    const result = marketResearchGeneratorService.generate({
      launch: {
        name: "Lancamento Expert X",
        expert: "Expert X",
        product: "Produto Y"
      },
      briefing: "Mulheres empreendedoras querem vender mais com uma comunicacao simples, humana e previsivel.",
      objective: "Validar mensagens para aumentar interesse e inscricoes.",
      productContext: "Programa de mentoria para posicionamento e conversao de experts no digital."
    });

    expect(result.themes).toHaveLength(3);
    expect(result.promises).toHaveLength(3);
    expect(result.objections).toHaveLength(3);
    expect(result.ctas).toHaveLength(3);
    expect(result.suggestedFormats).toHaveLength(4);
    expect(result.themes[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        rationale: expect.any(String)
      })
    );
  });
});
