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

// Ao clicar em "Escolher da Galeria"
btnGaleria.addEventListener("click", () => {
  inputGaleria.click();
});

// Ao clicar em "Tirar Foto"
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
  }
});

// Quando o usuário tira uma foto
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
  }
});

// Quando o usuário clica em "Processar"
btnProcessar.addEventListener("click", async () => {
  if (!arquivoSelecionado) return;

  btnProcessar.disabled = true;
  statusDiv.textContent = "Preparando imagem...";
  resultadoDiv.style.display = "none";
  resultadoDiv.innerHTML = "";
  btnCopiar.disabled = true;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    statusDiv.textContent = "Processando... aguarde.";

    try {
      // Em vez de chamar Groq diretamente, chamamos nossa Netlify Function
      const resposta = await fetch("/.netlify/functions/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageDataUrl: dataUrl
        })
      });

      if (!resposta.ok) {
        const errText = await resposta.text();
        throw new Error(`Erro na função: ${resposta.status} — ${errText}`);
      }

      const json = await resposta.json();
      // O JSON de resposta já vem no formato esperado:
      // { caixa: "CAIXA 08", dados: [ { "Data de repasse": "...", "Valor repassado": "..." }, ... ] }

      const nomeCaixa = json.caixa || "";
      const dados = Array.isArray(json.dados) ? json.dados : [];

      // Monta a tabela HTML
      const table = document.createElement("table");

      // Primeira linha: título da caixa (colspan=2)
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

        // Se o valor começar com "VERIFICAR:", aplicamos classe `.invalid`
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

      // Exibe a tabela e habilita o botão "Copiar"
      resultadoDiv.style.display = "block";
      resultadoDiv.innerHTML = ""; // limpa antes
      resultadoDiv.appendChild(table);

      btnCopiar.disabled = false;
      statusDiv.textContent = "Tabela extraída abaixo:";
    } catch (err) {
      console.error(err);
      statusDiv.textContent = `Ocorreu um erro: ${err.message}`;
    } finally {
      btnProcessar.disabled = false;
    }
  };

  reader.readAsDataURL(arquivoSelecionado);
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
