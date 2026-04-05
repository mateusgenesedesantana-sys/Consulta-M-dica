import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  // 1. Prioritize VITE_ prefix (Standard for Vite/Vercel)
  const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (viteKey && viteKey !== "undefined" && viteKey !== "null" && viteKey.length > 5) {
    console.log("Gemini API Key detectada via VITE_GEMINI_API_KEY (Vercel)");
    return viteKey;
  }

  // 2. Fallback to process.env (AI Studio / Vite define)
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    console.log("Gemini API Key detectada via GEMINI_API_KEY (AI Studio)");
    return process.env.GEMINI_API_KEY;
  }

  return "";
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

if (!apiKey) {
  console.error("ERRO: GEMINI_API_KEY não encontrada! Verifique as variáveis de ambiente na Vercel.");
}

export async function improveText(text: string) {
  if (!text.trim()) return text;
  
  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
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
    model: "gemini-flash-latest",
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
