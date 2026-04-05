import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function improveText(text: string) {
  if (!text.trim()) return text;
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Organize o seguinte texto médico de forma clara, concisa e técnica, usando termos médicos apropriados. 
    NÃO inclua introduções, conclusões, comentários ou diagramações extras. Retorne APENAS o texto médico organizado.
    Mantenha o conteúdo original, apenas melhore a redação técnica.
    
    Texto:
    ${text}`,
  });

  return response.text?.trim() || text;
}

export async function generateHypothesesAndPlan(hda: string, ef: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Com base na História da Doença Atual (HDA) e no Exame Físico (EF) fornecidos, liste hipóteses diagnósticas e condutas resumidas.
    
    HDA: ${hda}
    EF: ${ef}
    
    REGRAS PARA A RESPOSTA:
    1. Use quebras de linha reais (\\n) entre cada item numerado.
    2. Na CONDUTA, use verbos no indicativo em primeira pessoa (ex: "Solicito", "Realizo", "Prescrevo", "Oriento") em vez de infinitivo.
    3. Use infinitivo apenas para sugestões de acompanhamento (ex: "Avaliar melhora após").
    4. Retorne EXCLUSIVAMENTE um objeto JSON.
    
    Exemplo de formato:
    {
      "hypotheses": "1. Hipótese A\\n2. Hipótese B",
      "plan": "1. Solicito exame X\\n2. Prescrevo medicação Y\\n3. Avaliar melhora após 48h"
    }`,
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      hypotheses: data.hypotheses || "",
      plan: data.plan || ""
    };
  } catch (e) {
    console.error("Error parsing Gemini response", e);
    return { hypotheses: "", plan: "" };
  }
}
