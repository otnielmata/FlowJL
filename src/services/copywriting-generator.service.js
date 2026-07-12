function toSentenceCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeKeyword(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractMainTerms(briefing, objective, sourceContext) {
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
    "objetivo",
    "briefing",
    "produto",
    "marca",
    "lancamento"
  ]);

  const rawTerms = [briefing, objective, ...sourceContext.editorialPillars, ...sourceContext.languageCues]
    .join(" ")
    .split(/[^a-zA-Z0-9À-ÿ]+/)
    .map((word) => normalizeKeyword(word.trim()))
    .filter((word) => word.length >= 4 && !blacklist.has(word));

  return [...new Set(rawTerms)].slice(0, 4);
}

function resolveSections(format, product, expert, objective, mainTerm) {
  const sectionsByFormat = {
    REEL: [
      { label: "Abertura", content: `Abra com uma dor direta ligada a ${mainTerm} para capturar atencao imediata.` },
      { label: "Desenvolvimento", content: `Mostre rapidamente como ${product} ajuda o publico do expert ${expert} a avancar em ${objective.toLowerCase()}.` },
      { label: "Fechamento", content: "Conclua com um passo simples, claro e orientado para acao." }
    ],
    CAROUSEL: [
      { label: "Promessa", content: `Apresente uma promessa clara conectando ${mainTerm} ao resultado esperado.` },
      { label: "Construcao", content: `Desdobre a ideia em blocos curtos que reforcem o valor pratico de ${product}.` },
      { label: "Conversao", content: "Feche com sintese, urgencia leve e CTA objetivo." }
    ],
    STORIES: [
      { label: "Gancho", content: `Abra com uma pergunta ou contraste sobre ${mainTerm}.` },
      { label: "Sequencia", content: `Mostre um microcaminho que torne ${objective.toLowerCase()} mais tangivel.` },
      { label: "CTA", content: "Leve a audiencia para responder, clicar ou entrar na lista." }
    ],
    EMAIL: [
      { label: "Abertura", content: `Use uma abertura pessoal que conecte ${mainTerm} ao momento atual do leitor.` },
      { label: "Argumentacao", content: `Desenvolva a tese central reforcando o posicionamento do expert ${expert} e a oferta ${product}.` },
      { label: "Conversao", content: "Feche com CTA claro, beneficio concreto e proximo passo definido." }
    ],
    YOUTUBE: [
      { label: "Hook", content: `Inicie com uma promessa forte relacionada a ${mainTerm}.` },
      { label: "Roteiro-base", content: `Estruture a narrativa em problema, mecanismo e convite, alinhando ${product} ao objetivo ${objective.toLowerCase()}.` },
      { label: "Fechamento", content: "Finalize reforcando autoridade, beneficio e CTA." }
    ],
    ADS: [
      { label: "Interrupcao", content: `Interrompa o scroll com uma afirmacao ousada sobre ${mainTerm}.` },
      { label: "Prova", content: `Acrescente mecanismo ou beneficio principal de ${product} em tom direto.` },
      { label: "Chamada", content: "Feche com CTA curto, especifico e orientado a resultado." }
    ],
    LANDING_PAGE: [
      { label: "Hero", content: `Crie um hero centrado na transformacao prometida por ${product}.` },
      { label: "Argumentacao", content: "Organize blocos que sustentem a promessa com clareza e diferenciacao." },
      { label: "Conversao", content: "Repita o CTA com beneficio, seguranca e senso de direcao." }
    ]
  };

  return sectionsByFormat[format];
}

class CopywritingGeneratorService {
  generate({ launch, format, objective, briefing, sourceContext, positioning, offer }) {
    const terms = extractMainTerms(briefing, objective, sourceContext);
    const mainTerm = terms[0] ?? normalizeKeyword(launch.product);
    const positioningPromise = positioning.centralPromise;
    const offerPromise = offer.promise;

    return {
      headline: `${toSentenceCase(mainTerm)} com a promessa de ${positioningPromise.toLowerCase()}`,
      hook: `Se voce quer ${objective.toLowerCase()}, esta copy conecta a visao de ${launch.expert} com a transformacao de ${offerPromise.toLowerCase()}.`,
      bodySections: resolveSections(format, launch.product, launch.expert, objective, mainTerm),
      cta: `Avance agora para conhecer ${launch.product} e aplicar o proximo passo com ${launch.expert}.`,
      reviewNotes: [
        "Validar aderencia do tom de voz com o expert antes da publicacao.",
        "Revisar a promessa central para manter coerencia com a pagina ou criativo final.",
        `Checar se o CTA conversa com o objetivo principal: ${objective}.`
      ]
    };
  }
}

export const copywritingGeneratorService = new CopywritingGeneratorService();
