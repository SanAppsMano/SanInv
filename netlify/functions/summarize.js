// netlify/functions/summarize.js

exports.handler = async (event, _context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Método não permitido",
    };
  }

  try {
    const { texto } = JSON.parse(event.body);
    if (!texto) {
      return {
        statusCode: 400,
        body: "Faltando campo 'texto' no corpo da requisição",
      };
    }

    const rawKeys = process.env.GROQ_API_KEYS || "";
    const apiKeys = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (apiKeys.length === 0) {
      return {
        statusCode: 500,
        body: "Nenhuma chave configurada em GROQ_API_KEYS",
      };
    }

    let lastError = null;

    for (const key of apiKeys) {
      try {
        const payload = {
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Você é um arquivista especialista. A partir do texto a seguir, gere um nome curto de até três palavras que represente o conteúdo, depois produza um resumo objetivo e uma análise sucinta. Responda somente em JSON no formato {\"nome\":\"...\",\"resumo\":\"...\",\"analise\":\"...\"} sem comentários.",
                },
                { type: "text", text: texto },
              ],
            },
          ],
          temperature: 0,
          max_completion_tokens: 512,
          top_p: 1,
          stream: false,
        };

        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          const json = await response.json();
          let content = json.choices[0].message.content.trim();

          if (content.startsWith("```")) {
            content = content
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/```$/, "")
              .trim();
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

          return {
            statusCode: 200,
            body: JSON.stringify(parsed),
            headers: {
              "Content-Type": "application/json",
            },
          };
        }

        const erroTexto = await response.text();
        lastError = `Chave inválida ou sem tokens: HTTP ${response.status} — ${erroTexto}`;
      } catch (err) {
        lastError = `Erro ao tentar chave: ${err.message}`;
      }
    }

    return {
      statusCode: 500,
      body: `Todas as chaves falharam. Último erro: ${lastError}`,
    };
  } catch (err) {
    console.error("Erro interno na função:", err);
    return {
      statusCode: 500,
      body: "Erro interno na função: " + err.message,
    };
  }
};
