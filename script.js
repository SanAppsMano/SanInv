// script.js

const btnGaleria = document.getElementById("btnGaleria");
const btnCamera = document.getElementById("btnCamera");
const inputGaleria = document.getElementById("inputGaleria");
const inputCamera = document.getElementById("inputCamera");
const btnProcessar = document.getElementById("processar");
const btnCopiar = document.getElementById("copiar");
const btnCopiarResumo = document.getElementById("copiarResumo");
const statusDiv = document.getElementById("status");
const resultadoDiv = document.getElementById("resultado");
const resumoDiv = document.getElementById("resumo");
const resumoPre = document.getElementById("textoResumo");
const filenameDiv = document.getElementById("filename");
const previewImg = document.getElementById("preview");
const spinner = document.getElementById("spinner");
const historicoDiv = document.getElementById("historico");
const listaHistorico = document.getElementById("listaHistorico");
const btnLimparHistorico = document.getElementById("limparHistorico");
const tituloHistorico = document.getElementById("tituloHistorico");

let arquivoSelecionado = null;
let objectUrl = null;
let reader = null;

function carregarHistorico() {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem("historico")) || [];
  } catch {}
  if (arr.length > 0) {
    historicoDiv.style.display = "block";
    if (tituloHistorico)
      tituloHistorico.textContent = `Histórico (${arr.length})`;
    if (btnLimparHistorico) btnLimparHistorico.style.display = "block";
    listaHistorico.innerHTML = "";
    arr.forEach((item) => {
      const div = document.createElement("div");
      div.className = "hist-item";

      const img = document.createElement("img");
      img.className = "hist-thumb";
      img.src = item.thumb;
      img.alt = item.nome;

      const caption = document.createElement("span");
      caption.className = "hist-caption";
      caption.textContent = item.nome;

      div.appendChild(img);
      div.appendChild(caption);

      div.addEventListener("click", () => {
        resultadoDiv.style.display = "block";
        resultadoDiv.innerHTML = `<pre>${item.texto}</pre>`;
        if (item.resumo) {
          resumoPre.textContent = item.resumo;
          resumoDiv.style.display = "block";
          btnCopiarResumo.disabled = false;
        } else {
          resumoDiv.style.display = "none";
          resumoPre.textContent = "";
          btnCopiarResumo.disabled = true;
        }
      });

      listaHistorico.appendChild(div);
    });
  } else {
    historicoDiv.style.display = "none";
    listaHistorico.innerHTML = "";
    if (tituloHistorico) tituloHistorico.textContent = "Histórico";
    if (btnLimparHistorico) btnLimparHistorico.style.display = "none";
  }
}

function salvarHistorico(nome, texto, thumb, resumo) {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem("historico")) || [];
  } catch {}
  arr.unshift({
    nome,
    texto,
    thumb,
    resumo,
    data: new Date().toLocaleString(),
  });
  if (arr.length > 10) arr = arr.slice(0, 10);
  try {
    localStorage.setItem("historico", JSON.stringify(arr));
  } catch (err) {
    if (
      err &&
      (err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014)
    ) {
      while (arr.length > 0) {
        arr.pop();
        try {
          localStorage.setItem("historico", JSON.stringify(arr));
          break;
        } catch (e) {
          if (
            !(
              e &&
              (e.name === "QuotaExceededError" ||
                e.code === 22 ||
                e.code === 1014)
            )
          ) {
            break;
          }
        }
      }
    }
  }
  carregarHistorico();
}

document.addEventListener("DOMContentLoaded", carregarHistorico);

if (btnLimparHistorico) {
  btnLimparHistorico.addEventListener("click", () => {
    localStorage.removeItem("historico");
    carregarHistorico();
    statusDiv.textContent = "Histórico limpo.";
  });
}


// Abre o seletor da galeria
btnGaleria.addEventListener("click", () => {
  inputGaleria.click();
});

// Abre a câmera (mobile)
btnCamera.addEventListener("click", () => {
  inputCamera.click();
});

// Quando o usuário escolhe um arquivo da galeria
inputGaleria.addEventListener("change", () => {
  if (inputGaleria.files.length > 0) {
    arquivoSelecionado = inputGaleria.files[0];
    filenameDiv.textContent = `Arquivo selecionado: ${arquivoSelecionado.name}`;
    filenameDiv.style.display = "block";
    btnProcessar.disabled = false;
    resultadoDiv.style.display = "none";
    resultadoDiv.innerHTML = "";
    resumoDiv.style.display = "none";
    resumoPre.textContent = "";
    statusDiv.textContent = "";
    btnCopiar.disabled = true;
    btnCopiarResumo.disabled = true;

    // Cria/revoga object URL para otimizar memória
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    objectUrl = URL.createObjectURL(arquivoSelecionado);
    previewImg.src = objectUrl;
    previewImg.style.display = "block";
  }
});

// Quando o usuário tira uma foto com a câmera
inputCamera.addEventListener("change", () => {
  if (inputCamera.files.length > 0) {
    arquivoSelecionado = inputCamera.files[0];
    filenameDiv.textContent = `Arquivo selecionado: ${arquivoSelecionado.name}`;
    filenameDiv.style.display = "block";
    btnProcessar.disabled = false;
    resultadoDiv.style.display = "none";
    resultadoDiv.innerHTML = "";
    resumoDiv.style.display = "none";
    resumoPre.textContent = "";
    statusDiv.textContent = "";
    btnCopiar.disabled = true;
    btnCopiarResumo.disabled = true;

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    objectUrl = URL.createObjectURL(arquivoSelecionado);
    previewImg.src = objectUrl;
    previewImg.style.display = "block";
  }
});

// Processa a imagem selecionada
btnProcessar.addEventListener("click", async () => {
  if (!arquivoSelecionado) return;

  btnProcessar.disabled = true;
  statusDiv.textContent = "Preparando imagem...";
  spinner.style.display = "block";
  resultadoDiv.style.display = "none";
  resultadoDiv.innerHTML = "";
  resumoDiv.style.display = "none";
  resumoPre.textContent = "";
  btnCopiar.disabled = true;
  btnCopiarResumo.disabled = true;

  try {
    reader = new FileReader();

    reader.onload = (e) => {
      const rawDataUrl = e.target.result;

      const img = new Image();
      img.onload = async () => {
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Comprime para JPEG qualidade 0.8
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);

        // Limpa canvas e imagem temporária
        ctx.clearRect(0, 0, width, height);
        img.src = "";
        canvas.remove();

        statusDiv.textContent = "Processando... aguarde.";

        let json;
        try {
          const resposta = await fetch("/.netlify/functions/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageDataUrl: compressedDataUrl }),
          });

          if (!resposta.ok) {
            const errText = await resposta.text();
            throw new Error(`Função retornou ${resposta.status}: ${errText}`);
          }

          json = await resposta.json();
        } catch (errFetch) {
          console.error(errFetch);
          statusDiv.textContent = `Erro no processamento: ${errFetch.message}`;
          btnProcessar.disabled = false;
          spinner.style.display = "none";
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
          previewImg.src = "";
          previewImg.style.display = "none";
          return;
        }

        const textoExtraido = typeof json.texto === "string" ? json.texto : "";

        const pre = document.createElement("pre");
        pre.textContent = textoExtraido;
        pre.style.whiteSpace = "pre-wrap";

        resultadoDiv.style.display = "block";
        resultadoDiv.innerHTML = "";
        resultadoDiv.appendChild(pre);
        btnCopiar.disabled = false;
        statusDiv.textContent = "Texto extraído abaixo:";

        const resumoTxt = await gerarResumo(textoExtraido);
        salvarHistorico(
          arquivoSelecionado.name,
          textoExtraido,
          compressedDataUrl,
          resumoTxt
        );

        // -------------------------------
        // Limpeza de memória
        // -------------------------------

        arquivoSelecionado = null;
        reader.onload = null;
        reader.onerror = null;
        reader = null;

        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        previewImg.src = "";
        previewImg.style.display = "none";

        inputGaleria.value = "";
        inputCamera.value = "";

        btnProcessar.disabled = false;
        spinner.style.display = "none";
      };

      // Removido o tratamento de erro de imagem para evitar mensagem falsa
      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      console.error("Erro no FileReader");
      statusDiv.textContent = "Falha ao ler a imagem.";
      btnProcessar.disabled = false;
      spinner.style.display = "none";
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      previewImg.src = "";
      previewImg.style.display = "none";
    };

    reader.readAsDataURL(arquivoSelecionado);
  } catch (err) {
    console.error("Erro inesperado no processamento:", err);
    statusDiv.textContent = `Erro inesperado: ${err.message}`;
    btnProcessar.disabled = false;
    spinner.style.display = "none";
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    previewImg.src = "";
    previewImg.style.display = "none";
  }
});

// Copia o texto para a área de transferência
btnCopiar.addEventListener("click", async () => {
  const pre = resultadoDiv.querySelector("pre");
  if (!pre) return;
  try {
    await navigator.clipboard.writeText(pre.textContent);
    statusDiv.textContent = "Texto copiado com sucesso!";
  } catch (err) {
    statusDiv.textContent = "Falha ao copiar: " + err;
  }
});

async function gerarResumo(texto) {
  if (!texto) return;

  statusDiv.textContent = "Gerando análise e resumo...";
  resumoDiv.style.display = "none";
  resumoPre.textContent = "";
  btnCopiarResumo.disabled = true;
  spinner.style.display = "block";

  try {
    const resp = await fetch("/.netlify/functions/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Função retornou ${resp.status}: ${errText}`);
    }

    const jsonResumo = await resp.json();
    const resumoTxt = [jsonResumo.resumo, jsonResumo.analise]
      .filter((t) => typeof t === "string" && t.trim().length > 0)
      .join("\n\n");

    resumoPre.textContent = resumoTxt;
    resumoDiv.style.display = "block";
    btnCopiarResumo.disabled = false;
    statusDiv.textContent = "Análise gerada abaixo:";
    spinner.style.display = "none";
    return resumoTxt;
  } catch (err) {
    console.error(err);
    statusDiv.textContent = `Erro ao gerar análise: ${err.message}`;
    spinner.style.display = "none";
  }
}

// Copia o resumo
btnCopiarResumo.addEventListener("click", () => {
  const pre = resumoPre;
  if (!pre || !pre.textContent) return;
  navigator.clipboard
    .writeText(pre.textContent)
    .then(() => {
      statusDiv.textContent = "Resumo copiado com sucesso!";
    })
    .catch((err) => {
      statusDiv.textContent = "Falha ao copiar: " + err;
    });
});
