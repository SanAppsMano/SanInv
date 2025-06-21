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
const imagemModal = document.getElementById("imagemModal");
const imagemAmpliada = document.getElementById("imagemAmpliada");
const inputFiltro = document.getElementById("filtroHistorico");
const selectOrdenar = document.getElementById("ordenarHistorico");
const btnExportarHistorico = document.getElementById("exportarHistorico");
const btnImportarHistorico = document.getElementById("btnImportarHistorico");
const inputImportarHistorico = document.getElementById("importarHistorico");
const btnExportarCSV = document.getElementById("exportarCSV");
const btnExportarPDF = document.getElementById("exportarPDF");

let arquivoSelecionado = null;
let objectUrl = null;
let historicoArr = [];
function exibirEntrada(item) {
  resultadoDiv.style.display = "block";
  resultadoDiv.innerHTML = `<pre>${item.texto}</pre>`;
  btnCopiar.disabled = false;
  if (item.resumo) {
    resumoPre.textContent = item.resumo;
    resumoDiv.style.display = "block";
    btnCopiarResumo.disabled = false;
  } else {
    resumoDiv.style.display = "none";
    resumoPre.textContent = "";
    btnCopiarResumo.disabled = true;
  }
}

let reader = null;

function carregarHistorico() {
  try {
    historicoArr = JSON.parse(localStorage.getItem("historico")) || [];
  } catch {
    historicoArr = [];
  }
  renderHistorico();
}

function filtrar(arr, texto) {
  if (!texto) return arr;
  const t = texto.toLowerCase();
  return arr.filter(
    (it) =>
      (it.nome && it.nome.toLowerCase().includes(t)) ||
      (it.texto && it.texto.toLowerCase().includes(t))
  );
}

function ordenar(arr, modo) {
  if (modo === "az") {
    return arr.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  }
  if (modo === "za") {
    return arr.slice().sort((a, b) => b.nome.localeCompare(a.nome));
  }
  return arr;
}

function renderHistorico() {
  const total = historicoArr.length;
  const filtroTxt = inputFiltro ? inputFiltro.value.trim() : "";
  const ordem = selectOrdenar ? selectOrdenar.value : "recentes";
  let arr = ordenar(filtrar(historicoArr, filtroTxt), ordem);

  if (total > 0) {
    historicoDiv.style.display = "block";
    if (tituloHistorico) {
      if (filtroTxt) {
        tituloHistorico.textContent = `Histórico (${arr.length}/${total})`;
      } else {
        tituloHistorico.textContent = `Histórico (${total})`;
      }
    }
    if (btnLimparHistorico) btnLimparHistorico.style.display = "block";
    if (btnExportarHistorico) btnExportarHistorico.style.display = "inline";
    if (btnExportarCSV) btnExportarCSV.style.display = "inline";
    if (btnExportarPDF) btnExportarPDF.style.display = "inline";
  } else {
    historicoDiv.style.display = "none";
    if (tituloHistorico) tituloHistorico.textContent = "Histórico";
    if (btnLimparHistorico) btnLimparHistorico.style.display = "none";
    if (btnExportarHistorico) btnExportarHistorico.style.display = "none";
    if (btnExportarCSV) btnExportarCSV.style.display = "none";
    if (btnExportarPDF) btnExportarPDF.style.display = "none";
  }

  listaHistorico.innerHTML = "";
  arr.forEach((item) => {
    const div = document.createElement("div");
    div.className = "hist-item";

    const img = document.createElement("img");
    img.className = "hist-thumb";
    img.src = item.thumb;
    img.alt = item.nome;

    img.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirImagem(item.thumb, item.nome);
      exibirEntrada(item);
    });

    const caption = document.createElement("span");
    caption.className = "hist-caption";
    caption.textContent = item.nome;

    div.appendChild(img);
    div.appendChild(caption);
    div.addEventListener("click", () => {
      exibirEntrada(item);
    });

    listaHistorico.appendChild(div);
  });
}

function updateStorageUsage() {
  const el = document.getElementById("storageUsage");
  if (!el || !('localStorage' in window)) return;
  let bytes = 0;
  try {
    const item = localStorage.getItem("historico");
    bytes = item ? JSON.stringify(item).length : 0;
  } catch {}
  const mb = bytes / (1024 * 1024);
  const max = 5;
  const percent = Math.min((mb / max) * 100, 100);
  el.textContent = `${mb.toFixed(2)} MB / ${max} MB`;
  if (el.tagName.toLowerCase() === "progress") {
    el.value = percent;
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
    data: new Date().toLocaleString("pt-BR"),
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
  historicoArr = arr;
  renderHistorico();
  updateStorageUsage();
}

document.addEventListener("DOMContentLoaded", () => {
  carregarHistorico();
  updateStorageUsage();
  if (inputFiltro) inputFiltro.addEventListener("input", renderHistorico);
  if (selectOrdenar) selectOrdenar.addEventListener("change", renderHistorico);
});

function abrirImagem(src, alt) {
  if (!imagemModal || !imagemAmpliada) return;
  imagemAmpliada.src = src;
  imagemAmpliada.alt = alt || "";
  imagemModal.style.display = "flex";
}

if (imagemModal) {
  imagemModal.addEventListener("click", () => {
    imagemModal.style.display = "none";
    imagemAmpliada.src = "";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imagemModal.style.display === "flex") {
      imagemModal.style.display = "none";
      imagemAmpliada.src = "";
    }
  });
}

if (btnLimparHistorico) {
  btnLimparHistorico.addEventListener("click", () => {
    localStorage.removeItem("historico");
    carregarHistorico();
    updateStorageUsage();
    statusDiv.textContent = "Histórico limpo.";
  });
}

function exportarHistorico() {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem("historico")) || [];
  } catch {}
  if (arr.length === 0) {
    statusDiv.textContent = "Nada para exportar.";
    return;
  }
  const blob = new Blob([JSON.stringify(arr, null, 2)], {
    type: "application/json",
  });
  const dt = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .split(".")[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico-${dt}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarCSV() {
  const arr = historicoArr;
  if (arr.length === 0) {
    statusDiv.textContent = "Nada para exportar.";
    return;
  }
  const header = ["Nome", "Data", "Texto", "Resumo", "ImagemBase64"];
  const linhas = arr.map((it) => {
    const valores = [
      it.nome,
      it.data,
      it.texto || "",
      it.resumo || "",
      it.thumb || "",
    ].map((v) => '"' + String(v).replace(/"/g, '""') + '"');
    return valores.join(";");
  });
  const csv = [header.join(";"), ...linhas].join("\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });
  const dt = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .split(".")[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico-${dt}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarPDF() {
  const arr = historicoArr;
  if (arr.length === 0) {
    statusDiv.textContent = "Nada para exportar.";
    return;
  }
  let html =
    "<html><head><title>Historico</title><style>body{font-family:sans-serif;} .item{margin-bottom:1rem;} img{max-width:200px;display:block;} pre{white-space:pre-wrap;}</style></head><body>";
  arr.forEach((it) => {
    html += `<div class="item"><h3>${it.nome}</h3><p>${it.data}</p><img src="${it.thumb}" alt=""/><pre>${
      it.texto || ""
    }</pre></div>`;
  });
  html += "</body></html>";
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }
}

function handleImportarHistorico(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const readerImp = new FileReader();
  readerImp.onload = () => {
    try {
      const dados = JSON.parse(readerImp.result);
      if (!Array.isArray(dados)) throw new Error("Formato inválido");
      historicoArr = dados.concat(historicoArr);
      localStorage.setItem("historico", JSON.stringify(historicoArr));
      renderHistorico();
      updateStorageUsage();
      statusDiv.textContent = "Histórico importado.";
    } catch (e) {
      statusDiv.textContent = "Erro ao importar: " + e.message;
    }
    inputImportarHistorico.value = "";
  };
  readerImp.readAsText(file);
}


if (btnExportarHistorico) {
  btnExportarHistorico.addEventListener("click", exportarHistorico);
}
if (btnImportarHistorico && inputImportarHistorico) {
  btnImportarHistorico.addEventListener("click", () => {
    inputImportarHistorico.click();
  });
  inputImportarHistorico.addEventListener("change", handleImportarHistorico);
}
if (btnExportarCSV) {
  btnExportarCSV.addEventListener("click", exportarCSV);
}
if (btnExportarPDF) {
  btnExportarPDF.addEventListener("click", exportarPDF);
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

        const { resumoTxt, nomeGerado } = await gerarResumo(textoExtraido);
        salvarHistorico(
          nomeGerado || arquivoSelecionado.name,
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
  if (!texto) return { resumoTxt: "", nomeGerado: "" };

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
    const nomeGerado = typeof jsonResumo.nome === "string" ? jsonResumo.nome : "";

    resumoPre.textContent = resumoTxt;
    resumoDiv.style.display = "block";
    btnCopiarResumo.disabled = false;
    statusDiv.textContent = "Análise gerada abaixo:";
    spinner.style.display = "none";
    return { resumoTxt, nomeGerado };
  } catch (err) {
    console.error(err);
    statusDiv.textContent = `Erro ao gerar análise: ${err.message}`;
    spinner.style.display = "none";
    return { resumoTxt: "", nomeGerado: "" };
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
