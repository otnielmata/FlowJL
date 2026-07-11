function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractSignals(...segments) {
  const stopWords = new Set([
    "para",
    "como",
    "mais",
    "com",
    "sem",
    "sobre",
    "esse",
    "essa",
    "isso",
    "produto",
    "contexto",
    "objetivo",
    "briefing",
    "avatar",
    "publico"
  ]);

  const unique = [];

  for (const segment of segments) {
    const tokens = normalizeText(segment)
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !stopWords.has(token));

    for (const token of tokens) {
      if (!unique.includes(token)) {
        unique.push(token);
      }
    }
  }

  return unique.slice(0, 6);
}

function titleize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

class AvatarGeneratorService {
  generate({ launch, currentAvatar, marketResearchHistory, competitorResearch }) {
    const signals = extractSignals(
      launch.name,
      launch.product,
      launch.expert,
      currentAvatar?.profile ?? "",
      ...(currentAvatar?.pains ?? []),
      ...(currentAvatar?.dreams ?? []),
      ...(currentAvatar?.objections ?? []),
      ...(marketResearchHistory ?? []).flatMap((item) => [item.objective ?? "", item.productContext ?? ""]),
      ...(competitorResearch?.items ?? []).flatMap((item) => [item.competitorName, ...item.evidences.map((evidence) => evidence.channel)])
    );

    const [primarySignal = "transformacao", secondarySignal = "clareza", tertiarySignal = "confianca"] = signals;

    return {
      profileAngles: [
        {
          title: `Perfil orientado por ${titleize(primarySignal)}`,
          rationale: `Ajuda a descrever o publico do lancamento ${launch.name} com foco no desejo central de ${primarySignal}.`
        },
        {
          title: `Perfil em busca de ${titleize(secondarySignal)}`,
          rationale: `Complementa a leitura do avatar com uma motivacao recorrente observada nas pesquisas estrategicas do lancamento.`
        }
      ],
      painAmplifiers: [
        {
          title: `Frustracao com falta de ${secondarySignal}`,
          rationale: `Explora a dor de nao conseguir avancar com ${secondarySignal} sem um caminho pratico.`
        },
        {
          title: `Cansaco de tentativas sem ${tertiarySignal}`,
          rationale: `Conecta objecoes e receios a um padrao de repeticao comum no mercado.`
        }
      ],
      dreamDrivers: [
        {
          title: `Desejo de conquistar ${primarySignal} com consistencia`,
          rationale: `Mantem o foco em ganho percebido e continuidade, em vez de promessas vagas.`
        },
        {
          title: `Busca por ${tertiarySignal} para decidir mais rapido`,
          rationale: "Fortalece a relacao entre clareza de decisao, seguranca e prontidao para agir."
        }
      ],
      languageCues: [
        {
          title: `Vocabulario de ${titleize(primarySignal)}`,
          rationale: `Sugere usar termos que traduzam ${primarySignal} em exemplos concretos e cotidianos.`
        },
        {
          title: `Tom direto sobre ${titleize(secondarySignal)}`,
          rationale: "Indica uma comunicacao objetiva, com menos abstração e mais demonstracao pratica."
        }
      ],
      humanReviewRequired: true
    };
  }
}

export const avatarGeneratorService = new AvatarGeneratorService();
