import { describe, expect, it } from "vitest";

const { avatarGeneratorService } = await import("../src/services/avatar-generator.service.js");

describe("avatarGeneratorService.generate", () => {
  it("returns structured suggestions to complement the avatar", () => {
    const result = avatarGeneratorService.generate({
      launch: {
        name: "Lancamento Expert X",
        product: "Mentoria Y",
        expert: "Expert X"
      },
      currentAvatar: {
        profile: "Mulheres empreendedoras buscando vendas previsiveis",
        pains: ["Falta de clareza na mensagem"],
        dreams: ["Atrair clientes com constancia"],
        objections: ["Nao sei se funciona para mim"]
      },
      marketResearchHistory: [],
      competitorResearch: {
        items: []
      }
    });

    expect(result.profileAngles).toHaveLength(2);
    expect(result.painAmplifiers).toHaveLength(2);
    expect(result.dreamDrivers).toHaveLength(2);
    expect(result.languageCues).toHaveLength(2);
    expect(result.humanReviewRequired).toBe(true);
  });
});
