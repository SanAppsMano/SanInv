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

    // As chaves devem estar definidas como variável de ambiente no Netlify:
    // GROQ_API_KEYS = "chave1,chave2,chave3"
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

    // Para cada chave, tentamos chamar a API até obter sucesso.
    for (const key of apiKeys) {
      try {
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
                    '{"caixa":"CAIXA XX","dados":[{"Data de repasse":"DD/MM/AAAA","Valor repassado":"123.456,78"}, ...]}. ' +
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

        // Faz a chamada à Groq API usando a chave atual
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

        // Se tiver sucesso, parseamos e retornamos
        if (response.ok) {
          const json = await response.json();
          let content = json.choices[0].message.content.trim();
          // Remove eventuais blocos ```json … ```
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

          // Se deu tudo certo, devolvemos o JSON do front-end
          return {
            statusCode: 200,
            body: JSON.stringify(parsed),
            headers: {
              "Content-Type": "application/json",
            },
          };
        }

        // Se o status não for 200, anotamos o erro e partimos para a próxima chave.
        const erroTexto = await response.text();
        lastError = `Chave inválida ou sem tokens: HTTP ${response.status} — ${erroTexto}`;
      } catch (err) {
        // Qualquer falha de fetch ou parse, anotamos e tentamos a próxima chave.
        lastError = `Erro ao tentar chave: ${err.message}`;
      }
    }

    // Se chegou aqui, nenhuma chave funcionou
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
