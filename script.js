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
    listaHistorico.innerHTML = "";
    arr.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.data} - ${item.nome}`;
      li.addEventListener("click", () => {
        resultadoDiv.style.display = "block";
        resultadoDiv.innerHTML = `<pre>${item.texto}</pre>`;
      });
      listaHistorico.appendChild(li);
    });
  }
}

function salvarHistorico(nome, texto) {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem("historico")) || [];
  } catch {}
  arr.unshift({ nome, texto, data: new Date().toLocaleString() });
  if (arr.length > 10) arr = arr.slice(0, 10);
  localStorage.setItem("historico", JSON.stringify(arr));
  carregarHistorico();
}

document.addEventListener("DOMContentLoaded", carregarHistorico);


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

        salvarHistorico(arquivoSelecionado.name, textoExtraido);
        gerarResumo(textoExtraido);

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
