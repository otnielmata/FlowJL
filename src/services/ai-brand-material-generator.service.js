function normalizeKeyword(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractMainTerm(briefing, objective, sourceContext) {
  const blacklist = new Set(["para", "como", "sobre", "mais", "muito", "com", "sem", "uma", "que", "objetivo", "briefing", "produto", "marca", "lancamento"]);
  const words = [briefing, objective, ...sourceContext.editorialPillars, ...sourceContext.languageCues, ...sourceContext.brandSignals]
    .join(" ")
    .split(/[^a-zA-Z0-9À-ÿ]+/)
    .map((word) => normalizeKeyword(word.trim()))
    .filter((word) => word.length >= 4 && !blacklist.has(word));

  return [...new Set(words)][0] ?? normalizeKeyword(sourceContext.product);
}

function resolveSections(materialType, launch, objective, mainTerm, sourceContext) {
  const brandVoice = sourceContext.languageCues.slice(0, 2).join(" e ") || "clareza, autoridade e proximidade";

  const sections = {
    SCRIPT: [
      { label: "Abertura", content: `Abra com uma situacao concreta sobre ${mainTerm}, em tom ${brandVoice}, conectando a dor ao metodo da JL.` },
      { label: "Desenvolvimento", content: `Mostre o mecanismo por tras de ${launch.product} e explique por que ele sustenta o objetivo: ${objective}.` },
      { label: "Virada", content: `Traga um contraste entre improviso e processo, reforcando a autoridade de ${launch.expert}.` },
      { label: "Fechamento", content: "Finalize com convite simples para o proximo passo, mantendo revisao humana antes da publicacao." }
    ],
    COPY: [
      { label: "Promessa", content: `Conecte ${mainTerm} a uma promessa clara e especifica para o publico de ${launch.product}.` },
      { label: "Prova", content: `Use os pilares editoriais como sustentacao: ${sourceContext.editorialPillars.join(", ") || "autoridade e clareza"}.` },
      { label: "Argumento", content: `Traduza a tese da marca em beneficio pratico, evitando exageros e mantendo consistencia com ${launch.expert}.` },
      { label: "Conversao", content: "Feche com urgencia leve, proximo passo objetivo e espaco para ajustes do copywriter." }
    ],
    EMAIL: [
      { label: "Assunto sugerido", content: `${launch.expert}: um caminho mais claro para ${mainTerm}` },
      { label: "Abertura", content: `Comece com uma leitura empatica do momento do leitor e conecte ao objetivo: ${objective}.` },
      { label: "Corpo", content: `Desenvolva a narrativa em problema, metodo e convite, alinhando ${launch.product} ao estilo da marca.` },
      { label: "PS", content: "Reforce o CTA com um lembrete humano, direto e sem promessa sensacionalista." }
    ]
  };

  return sections[materialType];
}

class AiBrandMaterialGeneratorService {
  generate({ launch, materialType, objective, briefing, sourceContext }) {
    const mainTerm = extractMainTerm(briefing, objective, sourceContext);

    return {
      title: `${materialType === "EMAIL" ? "E-mail" : materialType === "SCRIPT" ? "Roteiro" : "Copy"} para ${launch.product}: ${mainTerm}`,
      hook: `A proposta conecta ${mainTerm} ao metodo da JL, preservando o tom de ${launch.expert} e a consistencia da marca.`,
      sections: resolveSections(materialType, launch, objective, mainTerm, sourceContext),
      cta: `Avancar para revisar e adaptar este ${materialType === "EMAIL" ? "e-mail" : materialType === "SCRIPT" ? "roteiro" : "texto"} antes da publicacao.`,
      reviewNotes: [
        "Revisar aderencia fina ao tom da marca antes de publicar.",
        "Validar se a promessa respeita o posicionamento atual e a oferta vigente.",
        "Ajustar exemplos, provas e CTA conforme canal de distribuicao.",
        "Nenhum prompt interno ou fonte sensivel deve ser incluido no material final."
      ]
    };
  }
}

export const aiBrandMaterialGeneratorService = new AiBrandMaterialGeneratorService();
