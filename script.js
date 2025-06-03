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

// Regex para validar números no formato brasileiro: “1.234,56”
const numPattern = /^\d{1,3}(?:\.\d{3})*,\d{2}$/;

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
    statusDiv.textContent = "";
    btnCopiar.disabled = true;

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
    statusDiv.textContent = "";
    btnCopiar.disabled = true;

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

        const nomeCaixa = json.caixa || "";
        const dados = Array.isArray(json.dados) ? json.dados : [];

        // Gera tabela HTML
        const table = document.createElement("table");

        // Primeira linha: nome da caixa (colspan=2)
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

        // Corpo da tabela com validação de números
        const tbody = document.createElement("tbody");
        dados.forEach((linha) => {
          const tr = document.createElement("tr");
          const rawD = linha["Data de repasse"] || "";
          const rawV = linha["Valor repassado"] || "";

          // Coluna Data de repasse (presumimos que já seja válida no JSON)
          const tdD = document.createElement("td");
          tdD.textContent = rawD;
          tr.appendChild(tdD);

          // Coluna Valor repassado: valida formato numérico
          const tdV = document.createElement("td");
          if (!numPattern.test(rawV)) {
            tdV.textContent = rawV;
            tdV.classList.add("invalid");
          } else {
            tdV.textContent = rawV;
          }
          tr.appendChild(tdV);

          tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        // Exibe a tabela e habilita o botão "Copiar"
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

// Copia a tabela para a área de transferência
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
