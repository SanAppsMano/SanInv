// netlify/functions/extract.js

exports.handler = async (event, _context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Método não permitido",
    };
  }

  try {
    // Lê do corpo JSON enviado pelo front-end
    const { imageDataUrl } = JSON.parse(event.body);
    if (!imageDataUrl) {
      return {
        statusCode: 400,
        body: "Faltando imageDataUrl no corpo da requisição",
      };
    }

    // As chaves devem estar definidas como variável de ambiente no Netlify:
    // Exemplo no painel Netlify:
    // GROQ_API_KEYS=chave1,chave2,chave3
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

    // Tenta cada chave em sequência até ganhar um HTTP 200
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
                    "Extraia todo o texto vis\u00edvel da imagem mantendo fidelidade ao conte\u00fado. " +
                    "Se houver o nome e n\u00famero da caixa (ex.: 'CAIXA 08'), coloque no campo 'caixa'. " +
                    "Copie integralmente as tabelas, preservando os nomes das colunas e cada linha. " +
                    "Textos que n\u00e3o pertencem a tabelas devem ser listados na coluna 'texto_livre' na ordem em que aparecem. " +
                    "O campo 'dados' deve ser um array cujos objetos possuam exatamente as mesmas chaves das colunas identificadas. " +
                    "Para n\u00fameros fora do padr\u00e3o brasileiro de pontos e v\u00edrgula, anteponha 'VERIFICAR:' ao valor. " +
                    "Retorne apenas o JSON: {\"caixa\":\"CAIXA XX\",\"dados\":[{\"Coluna\":\"valor\"}, ...]}. " +
                    "Sem texto adicional ou coment\u00e1rios.",
                },
                {
                  type: "image_url",
                  image_url: { url: imageDataUrl },
                },
              ],
            },
          ],
          temperature: 0,
          max_completion_tokens: 1024,
          top_p: 1,
          stream: false,
        };

        // Faz a chamada à Groq API usando a chave corrente
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

        // Se a resposta for HTTP 200, parseia e retorna ao front-end
        if (response.ok) {
          const json = await response.json();
          let content = json.choices[0].message.content.trim();

          // Se vier dentro de blocos ```json ... ```
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
              body:
                "Erro ao fazer parse do JSON retornado pela Groq API: " +
                err.message,
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

        // Se não for 200, armazena o erro e parte para a próxima chave
        const erroTexto = await response.text();
        lastError = `Chave inválida ou sem tokens: HTTP ${response.status} — ${erroTexto}`;
      } catch (err) {
        // Captura falhas de fetch ou parse e continua para a próxima chave
        lastError = `Erro ao tentar chave: ${err.message}`;
      }
    }

    // Se chegar aqui, nenhuma chave funcionou
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
