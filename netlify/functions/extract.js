// netlify/functions/extract.js

import fetch from "node-fetch";

exports.handler = async (event, _context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Método não permitido",
    };
  }

  try {
    const { imageDataUrl } = JSON.parse(event.body);
    if (!imageDataUrl) {
      return {
        statusCode: 400,
        body: "Faltando imageDataUrl no corpo da requisição",
      };
    }

    // A chave deve estar definida como variável de ambiente no Netlify:
    //   GROQ_API_KEY = "gsk_…sua_chave…"
    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: "Chave de API não configurada no ambiente",
      };
    }

    // Monta o payload para a Groq API
    const payload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 
                "Extraia da imagem o nome e número da caixa (por exemplo 'CAIXA 08') e a tabela de duas colunas 'Data de repasse' e 'Valor repassado'. " +
                "Para qualquer número que não se enquadre no padrão de separação de milhares (pontos) e decimais (vírgula), anteponha 'VERIFICAR:' ao valor. " +
                "Retorne estritamente um JSON puro: " +
                "{\"caixa\":\"CAIXA XX\",\"dados\":[{\"Data de repasse\":\"DD/MM/AAAA\",\"Valor repassado\":\"123.456,78\"}, ...]}. " +
                "Sem texto adicional ou comentários."
            },
            {
              type: "image_url",
              image_url: { url: imageDataUrl }
            }
          ]
        }
      ],
      temperature: 0,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false
    };

    // Chama a Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const erroTexto = await response.text();
      return {
        statusCode: response.status,
        body: `Erro Groq API: ${erroTexto}`,
      };
    }

    const json = await response.json();
    let content = json.choices[0].message.content.trim();

    // Caso venha entre backticks ```json … ```
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return {
        statusCode: 500,
        body: "Erro ao fazer parse do JSON retornado pela Groq API: " + err.message,
      };
    }

    // Retorna somente o JSON parseado para o front‐end
    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
      headers: {
        "Content-Type": "application/json"
      }
    };
  } catch (err) {
    console.error("Erro interno na função:", err);
    return {
      statusCode: 500,
      body: "Erro interno na função: " + err.message,
    };
  }
};
