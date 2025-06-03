// netlify/functions/extract.js

exports.handler = async (event, _context) => {
  // Permitimos somente POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Método não permitido (use POST)",
    };
  }

  // Passo 1: parse do body JSON
  let payloadBody;
  try {
    payloadBody = JSON.parse(event.body);
  } catch (parseErr) {
    console.error("[extract] Erro ao fazer parse do corpo JSON:", parseErr);
    return {
      statusCode: 400,
      body: `Erro ao parsear JSON de entrada: ${parseErr.message}`,
    };
  }

  const { imageDataUrl } = payloadBody;
  if (!imageDataUrl) {
    console.error("[extract] Falta imageDataUrl no corpo");
    return {
      statusCode: 400,
      body: "Faltando campo imageDataUrl no JSON enviado",
    };
  }

  // Passo 2: obter lista de chaves do ambiente
  const rawKeys = process.env.GROQ_API_KEYS || "";
  const apiKeys = rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (apiKeys.length === 0) {
    console.error("[extract] Nenhuma chave configurada em GROQ_API_KEYS");
    return {
      statusCode: 500,
      body: "Nenhuma chave configurada em GROQ_API_KEYS",
    };
  }

  let lastErrorMessage = "";

  // Passo 3: para cada chave, tentar a chamada à Groq API
  for (const key of apiKeys) {
    try {
      // Montamos o request body para a Groq API
      const groqPayload = {
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
                  "Sem texto adicional ou comentários.",
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

      let response;
      try {
        response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify(groqPayload),
          }
        );
      } catch (fetchErr) {
        console.error(`[extract] Fetch falhou com a chave ${key}:`, fetchErr);
        lastErrorMessage = `Falha de rede ou DNS ao usar chave ${key}: ${fetchErr.message}`;
        // Vai para a próxima chave
        continue;
      }

      // Se não for 200, coleta o texto de erro e tenta próxima
      if (!response.ok) {
        const errorText = await response.text().catch((e) => e.message);
        console.error(
          `[extract] Resposta não OK para chave ${key}: HTTP ${
            response.status
          } — ${errorText}`
        );
        lastErrorMessage = `Chave ${key} retornou HTTP ${response.status}: ${errorText}`;
        continue;
      }

      // Passo 4: parse da resposta JSON da Groq
      let groqJson;
      try {
        groqJson = await response.json();
      } catch (jsonErr) {
        console.error(
          `[extract] Erro ao parsear JSON do Groq para chave ${key}:`,
          jsonErr
        );
        lastErrorMessage = `Erro ao parsear JSON (chave ${key}): ${jsonErr.message}`;
        continue;
      }

      // Passo 5: extrair conteúdo (remover backticks se tiver)
      let content = groqJson.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        console.error(
          `[extract] Formato inesperado da resposta (chave ${key}):`,
          groqJson
        );
        lastErrorMessage = `Resposta inesperada (chave ${key})`;
        continue;
      }

      content = content.trim();
      if (content.startsWith("```")) {
        content = content
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/```$/, "")
          .trim();
      }

      // Passo 6: parse do conteúdo JSON retornado
      let parsedResult;
      try {
        parsedResult = JSON.parse(content);
      } catch (parseErr2) {
        console.error(
          `[extract] Erro ao fazer parse do conteúdo JSON (chave ${key}):`,
          parseErr2
        );
        lastErrorMessage = `Falha no JSON retornado (chave ${key}): ${parseErr2.message}`;
        continue;
      }

      // Se chegou até aqui, encontramos uma chave válida. Enviamos o JSON parseado ao front-end.
      return {
        statusCode: 200,
        body: JSON.stringify(parsedResult),
        headers: {
          "Content-Type": "application/json",
        },
      };
    } catch (outerErr) {
      // Captura qualquer outro erro inesperado dentro do loop de chaves
      console.error(`[extract] Erro inesperado com chave ${key}:`, outerErr);
      lastErrorMessage = `Erro inesperado (chave ${key}): ${outerErr.message}`;
      continue;
    }
  }

  // Se nenhuma chave funcionou, retornamos 500 com a última mensagem de erro
  console.error("[extract] Todas as chaves falharam. Último erro:", lastErrorMessage);
  return {
    statusCode: 500,
    body: `Todas as chaves falharam. Último erro: ${lastErrorMessage}`,
  };
};
