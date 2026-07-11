function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toTitleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function extractKeywords(...segments) {
  const blacklist = new Set([
    "para",
    "como",
    "sobre",
    "mais",
    "muito",
    "com",
    "sem",
    "uma",
    "que",
    "dos",
    "das",
    "por",
    "nos",
    "nas",
    "ser",
    "sua",
    "seu",
    "sao",
    "são",
    "esse",
    "essa",
    "isso",
    "este",
    "esta",
    "objetivo",
    "briefing",
    "produto",
    "contexto"
  ]);

  const uniqueKeywords = [];

  for (const segment of segments) {
    const words = normalizeText(segment)
      .split(/[^a-z0-9]+/i)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !blacklist.has(word));

    for (const word of words) {
      if (!uniqueKeywords.includes(word)) {
        uniqueKeywords.push(word);
      }
    }
  }

  return uniqueKeywords.slice(0, 6);
}

function ensureKeywords(keywords, launch) {
  if (keywords.length >= 3) {
    return keywords;
  }

  return [...keywords, normalizeText(launch.product), normalizeText(launch.expert), "transformacao"].slice(0, 6);
}

class MarketResearchGeneratorService {
  generate({ launch, briefing, objective, productContext }) {
    const keywords = ensureKeywords(extractKeywords(briefing, objective, productContext), launch);
    const [primaryKeyword, secondaryKeyword, tertiaryKeyword] = keywords;

    return {
      themes: [
        {
          title: `${toTitleCase(primaryKeyword)} como gatilho principal`,
          rationale: `Conecta o produto ${launch.product} ao desejo central descrito no briefing do lançamento ${launch.name}.`
        },
        {
          title: `${toTitleCase(secondaryKeyword)} como prova prática`,
          rationale: `Ajuda a tangibilizar o objetivo informado e sustenta a mensagem com exemplos aplicáveis ao contexto do expert ${launch.expert}.`
        },
        {
          title: `${toTitleCase(tertiaryKeyword)} para reduzir atrito`,
          rationale: "Cria uma linha de comunicação capaz de antecipar dúvidas e facilitar a progressão para a oferta."
        }
      ],
      promises: [
        {
          title: `Acelerar ${primaryKeyword} com um caminho aplicável`,
          rationale: `Promessa alinhada ao objetivo informado, com foco em resultado prático para quem busca ${primaryKeyword}.`
        },
        {
          title: `Transformar ${secondaryKeyword} em rotina consistente`,
          rationale: `Reforça recorrência e percepção de método no posicionamento do produto ${launch.product}.`
        },
        {
          title: `Reduzir o tempo entre interesse e ação`,
          rationale: `Direciona a comunicação para velocidade de decisão sem abrir mão da revisão humana da estratégia.`
        }
      ],
      objections: [
        {
          title: "Nao sei se isso funciona para a minha realidade",
          rebuttal: `Responder com recortes do contexto do produto e exemplos do universo do expert ${launch.expert}.`
        },
        {
          title: "Parece interessante, mas nao e o momento",
          rebuttal: "Explorar custo da inercia, urgencia percebida e ganho incremental do primeiro passo."
        },
        {
          title: "Ja tentei algo parecido antes",
          rebuttal: `Diferenciar o lancamento ${launch.name} pela estrutura, acompanhamento e clareza de implementacao.`
        }
      ],
      ctas: [
        `Descobrir como aplicar ${primaryKeyword} no proximo passo`,
        `Ver o mapa pratico para ${secondaryKeyword}`,
        `Entrar na lista prioritaria do lancamento ${launch.name}`
      ],
      suggestedFormats: [
        {
          type: "carrossel",
          angle: `Quebra de mitos sobre ${primaryKeyword}`
        },
        {
          type: "video-curto",
          angle: `Demonstracao rapida de ${secondaryKeyword} com CTA para o lancamento`
        },
        {
          type: "live",
          angle: `Sessao de perguntas e respostas sobre ${tertiaryKeyword} e objecoes de compra`
        },
        {
          type: "email",
          angle: `Sequencia de aquecimento orientada ao objetivo: ${objective}`
        }
      ]
    };
  }
}

export const marketResearchGeneratorService = new MarketResearchGeneratorService();
