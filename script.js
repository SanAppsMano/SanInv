// script.js

const btnGaleria = document.getElementById("btnGaleria");
const btnCamera = document.getElementById("btnCamera");
const inputGaleria = document.getElementById("inputGaleria");
const inputCamera = document.getElementById("inputCamera");
const btnProcessar = document.getElementById("processar");
const btnCopiar = document.getElementById("copiar");
const btnResumo = document.getElementById("resumir");
const btnCopiarResumo = document.getElementById("copiarResumo");
const statusDiv = document.getElementById("status");
const resultadoDiv = document.getElementById("resultado");
const resumoDiv = document.getElementById("resumo");
const filenameDiv = document.getElementById("filename");

let arquivoSelecionado = null;
let objectUrl = null;
let reader = null;
let textoExtraidoAtual = "";


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
    resumoDiv.innerHTML = "";
    statusDiv.textContent = "";
    btnCopiar.disabled = true;
    btnResumo.disabled = true;
    btnCopiarResumo.disabled = true;
    textoExtraidoAtual = "";
    textoExtraidoAtual = "";

    // Cria/revoga object URL para otimizar memória
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    objectUrl = URL.createObjectURL(arquivoSelecionado);
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
    resumoDiv.innerHTML = "";
    statusDiv.textContent = "";
    btnCopiar.disabled = true;
    btnResumo.disabled = true;
    btnCopiarResumo.disabled = true;

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    objectUrl = URL.createObjectURL(arquivoSelecionado);
  }
});

// Processa a imagem selecionada
btnProcessar.addEventListener("click", async () => {
  if (!arquivoSelecionado) return;

  btnProcessar.disabled = true;
  statusDiv.textContent = "Preparando imagem...";
  resultadoDiv.style.display = "none";
  resultadoDiv.innerHTML = "";
  resumoDiv.style.display = "none";
  resumoDiv.innerHTML = "";
  btnCopiar.disabled = true;
  btnResumo.disabled = true;
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
          return;
        }

        const textoExtraido = typeof json.texto === "string" ? json.texto : "";
        textoExtraidoAtual = textoExtraido;

        const pre = document.createElement("pre");
        pre.textContent = textoExtraido;
        pre.style.whiteSpace = "pre-wrap";

        resultadoDiv.style.display = "block";
        resultadoDiv.innerHTML = "";
        resultadoDiv.appendChild(pre);
        btnCopiar.disabled = false;
        btnResumo.disabled = false;
        statusDiv.textContent = "Texto extraído abaixo:";

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

        inputGaleria.value = "";
        inputCamera.value = "";

        btnProcessar.disabled = false;
      };

      // Removido o tratamento de erro de imagem para evitar mensagem falsa
      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      console.error("Erro no FileReader");
      statusDiv.textContent = "Falha ao ler a imagem.";
      btnProcessar.disabled = false;
    };

    reader.readAsDataURL(arquivoSelecionado);
  } catch (err) {
    console.error("Erro inesperado no processamento:", err);
    statusDiv.textContent = `Erro inesperado: ${err.message}`;
    btnProcessar.disabled = false;
  }
});

// Copia o texto para a área de transferência
btnCopiar.addEventListener("click", () => {
  const pre = resultadoDiv.querySelector("pre");
  if (!pre) return;
  const range = document.createRange();
  range.selectNode(pre);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  try {
    document.execCommand("copy");
    sel.removeAllRanges();
    statusDiv.textContent = "Texto copiado com sucesso!";
  } catch (err) {
    statusDiv.textContent = "Falha ao copiar: " + err;
  }
});

// Gera resumo do texto extraído
btnResumo.addEventListener("click", async () => {
  if (!textoExtraidoAtual) return;

  btnResumo.disabled = true;
  statusDiv.textContent = "Gerando resumo...";
  resumoDiv.style.display = "none";
  resumoDiv.innerHTML = "";
  btnCopiarResumo.disabled = true;

  try {
    const resp = await fetch("/.netlify/functions/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: textoExtraidoAtual }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Função retornou ${resp.status}: ${errText}`);
    }

    const jsonResumo = await resp.json();
    const resumo = typeof jsonResumo.resumo === "string" ? jsonResumo.resumo : "";

    const pre = document.createElement("pre");
    pre.textContent = resumo;
    pre.style.whiteSpace = "pre-wrap";

    resumoDiv.innerHTML = "";
    resumoDiv.appendChild(pre);
    resumoDiv.style.display = "block";
    btnCopiarResumo.disabled = false;
    statusDiv.textContent = "Resumo gerado abaixo:";
  } catch (err) {
    console.error(err);
    statusDiv.textContent = `Erro ao resumir: ${err.message}`;
  } finally {
    btnResumo.disabled = false;
  }
});

// Copia o resumo
btnCopiarResumo.addEventListener("click", () => {
  const pre = resumoDiv.querySelector("pre");
  if (!pre) return;
  const range = document.createRange();
  range.selectNode(pre);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  try {
    document.execCommand("copy");
    sel.removeAllRanges();
    statusDiv.textContent = "Resumo copiado com sucesso!";
  } catch (err) {
    statusDiv.textContent = "Falha ao copiar: " + err;
  }
});
