// script.js

const btnGaleria = document.getElementById("btnGaleria");
const btnCamera = document.getElementById("btnCamera");
const inputGaleria = document.getElementById("inputGaleria");
const inputCamera = document.getElementById("inputCamera");
const btnProcessar = document.getElementById("processar");
const btnCopiar = document.getElementById("copiar");
const statusDiv = document.getElementById("status");
const resultadoDiv = document.getElementById("resultado");
const filenameDiv = document.getElementById("filename");

let arquivoSelecionado = null;
let objectUrl = null;
let reader = null;

// Abrir galeria
btnGaleria.addEventListener("click", () => {
  inputGaleria.click();
});

// Abrir câmera
btnCamera.addEventListener("click", () => {
  inputCamera.click();
});

// Ao escolher arquivo na galeria
inputGaleria.addEventListener("change", () => {
  if (inputGaleria.files.length > 0) {
    arquivoSelecionado = inputGaleria.files[0];
    filenameDiv.textContent = `Arquivo selecionado: ${arquivoSelecionado.name}`;
    filenameDiv.style.display = "block";
    btnProcessar.disabled = false;
    resultadoDiv.style.display = "none";
    resultadoDiv.innerHTML = "";
    statusDiv.textContent = "";
    btnCopiar.disabled = true;

    // Cria um object URL para liberar depois
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    objectUrl = URL.createObjectURL(arquivoSelecionado);
  }
});

// Ao tirar foto com a câmera
inputCamera.addEventListener("change", () => {
  if (inputCamera.files.length > 0) {
    arquivoSelecionado = inputCamera.files[0];
    filenameDiv.textContent = `Arquivo selecionado: ${arquivoSelecionado.name}`;
    filenameDiv.style.display = "block";
    btnProcessar.disabled = false;
    resultadoDiv.style.display = "none";
    resultadoDiv.innerHTML = "";
    statusDiv.textContent = "";
    btnCopiar.disabled = true;

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    objectUrl = URL.createObjectURL(arquivoSelecionado);
  }
});

// Processar imagem selecionada
btnProcessar.addEventListener("click", async () => {
  if (!arquivoSelecionado) return;

  btnProcessar.disabled = true;
  statusDiv.textContent = "Preparando imagem...";
  resultadoDiv.style.display = "none";
  resultadoDiv.innerHTML = "";
  btnCopiar.disabled = true;

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

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);

        // Limpeza imediata do canvas e da imagem
        ctx.clearRect(0, 0, width, height);
        img.src = "";
        canvas.remove();

        statusDiv.textContent = "Processando... aguarde.";

        // Chamada à Netlify Function
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

        // Se chegou aqui, json está disponível
        const nomeCaixa = json.caixa || "";
        const dados = Array.isArray(json.dados) ? json.dados : [];

        const table = document.createElement("table");

        // Linha de título da caixa (colspan=2)
        const caixaRow = document.createElement("tr");
        const caixaCell = document.createElement("td");
        caixaCell.setAttribute("colspan", "2");
        caixaCell.textContent = nomeCaixa;
        caixaCell.classList.add("caixa-cell");
        caixaRow.appendChild(caixaCell);
        table.appendChild(caixaRow);

        // Cabeçalho da tabela
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Data de repasse", "Valor repassado"].forEach((col) => {
          const th = document.createElement("th");
          th.textContent = col;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Corpo da tabela
        const tbody = document.createElement("tbody");
        dados.forEach((linha) => {
          const tr = document.createElement("tr");
          const rawD = linha["Data de repasse"] || "";
          const rawV = linha["Valor repassado"] || "";

          const tdD = document.createElement("td");
          if (/^VERIFICAR:/i.test(rawD)) {
            tdD.textContent = rawD.replace(/^VERIFICAR:\s*/i, "");
            tdD.classList.add("invalid");
          } else {
            tdD.textContent = rawD;
          }
          tr.appendChild(tdD);

          const tdV = document.createElement("td");
          if (/^VERIFICAR:/i.test(rawV)) {
            tdV.textContent = rawV.replace(/^VERIFICAR:\s*/i, "");
            tdV.classList.add("invalid");
          } else {
            tdV.textContent = rawV;
          }
          tr.appendChild(tdV);

          tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        resultadoDiv.style.display = "block";
        resultadoDiv.innerHTML = "";
        resultadoDiv.appendChild(table);
        btnCopiar.disabled = false;
        statusDiv.textContent = "Tabela extraída abaixo:";

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

      img.onerror = () => {
        console.error("Erro ao carregar imagem para redimensionar");
        statusDiv.textContent = "Falha ao carregar a imagem.";
        btnProcessar.disabled = false;
      };

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

// Copiar tabela para a área de transferência
btnCopiar.addEventListener("click", () => {
  const table = resultadoDiv.querySelector("table");
  if (!table) return;
  const range = document.createRange();
  range.selectNode(table);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  try {
    document.execCommand("copy");
    sel.removeAllRanges();
    statusDiv.textContent = "Tabela copiada com sucesso!";
  } catch (err) {
    statusDiv.textContent = "Falha ao copiar: " + err;
  }
});
