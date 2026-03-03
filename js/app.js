import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

const CLOUDINARY_CLOUD_NAME = "dekxidyr4"; 
const CLOUDINARY_UPLOAD_PRESET = "diariorota";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const btnLogin = document.getElementById("btn-login");
let placaAtual = "";

let viagensCache = {}; 
let destinosArray = [];
let nfsArray = [];
let despMotArray = []; 

let mediaRecorder;
let audioChunks = [];
let audiosNovosBlobs = []; 
let audiosExistentes = []; 
let recordingInterval;
let recordingSeconds = 0;

// === 1. CONTROLADOR DE TELA ===
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginView.classList.add("hidden"); dashboardView.classList.remove("hidden");
        const opcoesData = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById("current-date").innerText = new Date().toLocaleDateString('pt-BR', opcoesData);
        
        let nomePiloto = user.displayName || user.email.split('@')[0];
        document.getElementById("user-greeting").innerText = `Olá, Gestor(a) ${nomePiloto.charAt(0).toUpperCase() + nomePiloto.slice(1)}! 💼`;
        
        // Sempre que logar, carrega logo a aba de motoristas em segundo plano
        carregarGestaoMotoristas();
    } else {
        dashboardView.classList.add("hidden"); loginView.classList.remove("hidden");
    }
});

document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        btnLogin.innerText = "Aguarde..."; btnLogin.disabled = true;
        await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("senha").value);
    } catch (erro) { alert("E-mail ou senha incorretos."); } 
    finally { btnLogin.innerText = "Entrar no Sistema"; btnLogin.disabled = false; }
});
document.getElementById("btn-logout")?.addEventListener("click", () => signOut(auth));

// === 2. NAVEGAÇÃO MASTER (FROTA VS MOTORISTAS) ===
const tabFrota = document.getElementById("tab-btn-frota");
const tabMotoristas = document.getElementById("tab-btn-motoristas");
const viewFrota = document.getElementById("view-frota");
const viewMotoristas = document.getElementById("view-motoristas");

tabFrota.addEventListener("click", () => {
    tabFrota.classList.add("active"); tabMotoristas.classList.remove("active");
    viewFrota.classList.remove("hidden"); viewMotoristas.classList.add("hidden");
});

tabMotoristas.addEventListener("click", () => {
    tabMotoristas.classList.add("active"); tabFrota.classList.remove("active");
    viewMotoristas.classList.remove("hidden"); viewFrota.classList.add("hidden");
    carregarGestaoMotoristas(); // Recarrega sempre que acessa
});

// === 3. SELEÇÃO DO CAMINHÃO ===
const tripModal = document.getElementById("trip-modal");
const fuelModal = document.getElementById("fuel-modal");
const maintModal = document.getElementById("maint-modal");
const panelVeiculo = document.getElementById("panel-veiculo"); 

document.querySelectorAll(".truck-card").forEach(button => {
    button.addEventListener("click", (e) => {
        document.querySelectorAll(".truck-card").forEach(btn => btn.classList.remove("active-truck"));
        e.currentTarget.classList.add("active-truck");
        placaAtual = e.currentTarget.getAttribute("data-placa");
        document.querySelectorAll(".placa-label").forEach(el => el.innerText = placaAtual);
        document.getElementById("history-title").innerText = `📄 Resumo Financeiro - ${placaAtual}`;
        
        panelVeiculo.classList.remove("hidden");
        carregarHistoricoCompleto(placaAtual);
    });
});

document.getElementById("btn-back-home")?.addEventListener("click", () => {
    panelVeiculo.classList.add("hidden");
    document.querySelectorAll(".truck-card").forEach(btn => btn.classList.remove("active-truck"));
    placaAtual = "";
});

// === LISTAS DINÂMICAS ===
function renderizarListas() {
    document.getElementById("lista-destinos").innerHTML = destinosArray.map((d, index) => `<li>${d} <span onclick="removerDestino(${index})">&times;</span></li>`).join('');
    document.getElementById("lista-nfs").innerHTML = nfsArray.map((nf, index) => `<li>${nf} <span onclick="removerNf(${index})">&times;</span></li>`).join('');
    
    document.getElementById("lista-desp-mot").innerHTML = despMotArray.map((d, index) => 
        `<li style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px;">
            <div style="width: 100%; display: flex; justify-content: space-between;">
                <strong>${d.nome}</strong> <span onclick="removerDespMot(${index})" style="cursor:pointer; color:red;">&times;</span>
            </div>
            <span style="font-size: 11px; color: #555;">VT: R$${d.vt.toFixed(2)} | VA: R$${d.va.toFixed(2)} | Diária: R$${d.diaria.toFixed(2)}</span>
            <strong style="color: #e67e22; font-size: 12px;">Total: R$${(d.vt + d.va + d.diaria).toFixed(2)}</strong>
        </li>`
    ).join('');
    atualizarTotais(); 
}

window.removerDestino = (index) => { destinosArray.splice(index, 1); renderizarListas(); };
window.removerNf = (index) => { nfsArray.splice(index, 1); renderizarListas(); };
window.removerDespMot = (index) => { despMotArray.splice(index, 1); renderizarListas(); };

document.getElementById("btn-add-destino")?.addEventListener("click", () => {
    const input = document.getElementById("destino_input");
    if(input.value.trim() !== "") { destinosArray.push(input.value.trim()); input.value = ""; renderizarListas(); }
});
document.getElementById("btn-add-nf")?.addEventListener("click", () => {
    const input = document.getElementById("nf_input");
    if(input.value.trim() !== "") { nfsArray.push(input.value.trim()); input.value = ""; renderizarListas(); }
});

document.getElementById("btn-add-desp-mot")?.addEventListener("click", () => {
    const nome = document.getElementById("nome_mot_input").value.trim();
    const vt = parseFloat(document.getElementById("vt_mot_input").value) || 0;
    const va = parseFloat(document.getElementById("va_mot_input").value) || 0;
    const diaria = parseFloat(document.getElementById("diaria_mot_input").value) || 0;
    
    if(nome !== "" && (vt > 0 || va > 0 || diaria > 0)) { 
        despMotArray.push({ 
            id_despesa: "desp_" + Date.now().toString(36) + Math.random().toString(36).substr(2),
            nome, vt, va, diaria, status: "Aberto" 
        }); 
        document.getElementById("nome_mot_input").value = "";
        document.getElementById("vt_mot_input").value = "";
        document.getElementById("va_mot_input").value = "";
        document.getElementById("diaria_mot_input").value = "";
        renderizarListas(); 
    } else { alert("Preencha o nome e ao menos um valor (VT, VA ou Diária)."); }
});

// === MOTOR DE ÁUDIO ===
const btnRecord = document.getElementById("btn-record-audio");
const containerAudios = document.getElementById("lista-audios-container");

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    return `${m}:${(sec % 60).toString().padStart(2, '0')}`;
}

function renderizarAudiosNaTela() {
    let html = "";
    audiosExistentes.forEach((url, index) => {
        html += `<div class="audio-item"><audio controls src="${url}" class="audio-player"></audio><button type="button" class="btn-delete-audio" onclick="removerAudioExistente(${index})">🗑️</button></div>`;
    });
    audiosNovosBlobs.forEach((blob, index) => {
        html += `<div class="audio-item"><audio controls src="${URL.createObjectURL(blob)}" class="audio-player"></audio><button type="button" class="btn-delete-audio" onclick="removerAudioNovo(${index})">🗑️</button></div>`;
    });
    containerAudios.innerHTML = html;
}

window.removerAudioExistente = (index) => { audiosExistentes.splice(index, 1); renderizarAudiosNaTela(); };
window.removerAudioNovo = (index) => { audiosNovosBlobs.splice(index, 1); renderizarAudiosNaTela(); };

function resetarPlayerDeAudio() {
    clearInterval(recordingInterval); audiosNovosBlobs = []; audiosExistentes = []; audioChunks = [];
    renderizarAudiosNaTela();
    btnRecord.classList.remove("is-recording");
    document.getElementById("record-icon").innerText = "🎤"; document.getElementById("record-text").innerText = "Gravar Áudio";
    document.getElementById("recording-timer").classList.add("hidden");
}

btnRecord?.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); clearInterval(recordingInterval);
        btnRecord.classList.remove("is-recording");
        document.getElementById("record-icon").innerText = "🎤"; document.getElementById("record-text").innerText = "Gravar Novo Áudio";
        document.getElementById("recording-timer").classList.add("hidden");
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream); audioChunks = [];
            mediaRecorder.ondataavailable = event => { if (event.data.size > 0) audioChunks.push(event.data); };
            mediaRecorder.onstop = () => {
                audiosNovosBlobs.push(new Blob(audioChunks, { type: 'audio/webm' })); renderizarAudiosNaTela(); stream.getTracks().forEach(track => track.stop()); 
            };
            mediaRecorder.start();
            btnRecord.classList.add("is-recording");
            document.getElementById("record-icon").innerText = "➔"; document.getElementById("record-text").innerText = "Enviar"; 
            recordingSeconds = 0; document.getElementById("timer-text").innerText = "00:00"; document.getElementById("recording-timer").classList.remove("hidden");
            recordingInterval = setInterval(() => { recordingSeconds++; document.getElementById("timer-text").innerText = formatTime(recordingSeconds); }, 1000);
        } catch (err) { alert("Permissão de microfone negada."); }
    }
});

async function uploadAudioToCloudinary(blob) {
    const formData = new FormData(); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); formData.append('file', blob, 'gravacao.webm');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error("Erro upload audio");
    return (await response.json()).secure_url;
}

// === MATEMÁTICA AUTOMÁTICA ===
const atualizarTotais = () => {
    const frete = parseFloat(document.getElementById("valor_frete").value) || 0;
    const despMotTotal = despMotArray.reduce((acc, curr) => acc + (curr.vt + curr.va + curr.diaria), 0);
    const ped = parseFloat(document.getElementById("desp_pedagio").value) || 0;
    const despesas = despMotTotal + ped;
    document.getElementById("total_despesas_display").innerText = despesas.toFixed(2);
    document.getElementById("total_liquido_display").innerText = (frete - despesas).toFixed(2);
};
document.querySelectorAll(".calc-input").forEach(input => input.addEventListener("input", atualizarTotais));

const calcularKm = () => {
    const inicio = parseFloat(document.getElementById("km_inicio").value) || 0;
    const final = parseFloat(document.getElementById("km_final").value) || 0;
    document.getElementById("km_total_display").innerText = final > inicio ? final - inicio : 0;
};
document.querySelectorAll(".calc-km").forEach(input => input.addEventListener("input", calcularKm));

// === ABRIR MODAIS ===
function resetarFormularioViagem() {
    document.getElementById("trip-form").reset(); document.getElementById("edit-trip-id").value = "";
    document.getElementById("trip-modal-title").innerHTML = `Nova Viagem - <span class="placa-label">${placaAtual}</span>`;
    document.getElementById("btn-save-trip").innerText = "💾 Salvar Viagem";
    destinosArray = []; nfsArray = []; despMotArray = []; renderizarListas();
    document.getElementById("total_despesas_display").innerText = "0.00"; document.getElementById("total_liquido_display").innerText = "0.00";
    calcularKm(); resetarPlayerDeAudio();
}

document.getElementById("btn-open-trip")?.addEventListener("click", () => { resetarFormularioViagem(); tripModal.classList.remove("hidden"); tripModal.classList.add("active"); });
document.getElementById("btn-open-fuel")?.addEventListener("click", () => { fuelModal.classList.remove("hidden"); fuelModal.classList.add("active"); });
document.getElementById("btn-open-maint")?.addEventListener("click", () => { maintModal.classList.remove("hidden"); maintModal.classList.add("active"); });
document.querySelectorAll(".close-modal").forEach(btn => { btn.addEventListener("click", (e) => { e.target.closest(".modal").classList.remove("active"); e.target.closest(".modal").classList.add("hidden"); }); });

// === SALVAMENTO NO FIRESTORE ===
document.getElementById("trip-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!auth.currentUser) return;
    const btn = document.getElementById("btn-save-trip"); const editId = document.getElementById("edit-trip-id").value; btn.disabled = true;

    try {
        let urlsGeradasNaNuvem = [];
        if (audiosNovosBlobs.length > 0) {
            btn.innerText = `⏳ Enviando ${audiosNovosBlobs.length} áudio(s)...`;
            urlsGeradasNaNuvem = await Promise.all(audiosNovosBlobs.map(blob => uploadAudioToCloudinary(blob))); 
        }
        btn.innerText = "💾 Salvando Dados...";

        const despMotTotal = despMotArray.reduce((acc, curr) => acc + (curr.vt + curr.va + curr.diaria), 0);

        const dadosViagem = {
            veiculo_id: placaAtual, motorista_uid: auth.currentUser.uid,
            data_viagem: document.getElementById("data_viagem").value, data_entrega: document.getElementById("data_entrega").value,
            origem: document.getElementById("origem").value, destinos: destinosArray, nfs: nfsArray, despesas_motoristas: despMotArray,
            observacoes: document.getElementById("observacoes").value, audios: [...audiosExistentes, ...urlsGeradasNaNuvem], 
            valores: {
                frete_bruto: parseFloat(document.getElementById("valor_frete").value) || 0,
                despesa_motorista: despMotTotal,
                despesa_pedagio: parseFloat(document.getElementById("desp_pedagio").value) || 0,
                total_despesas: parseFloat(document.getElementById("total_despesas_display").innerText),
                total_liquido: parseFloat(document.getElementById("total_liquido_display").innerText)
            },
            quilometragem: { km_inicio: parseFloat(document.getElementById("km_inicio").value) || 0, km_final: parseFloat(document.getElementById("km_final").value) || 0, km_total: parseFloat(document.getElementById("km_total_display").innerText) },
        };
        dadosViagem.status = dadosViagem.data_entrega ? "Concluída" : "Em Andamento";

        if (editId) { await updateDoc(doc(db, "viagens", editId), dadosViagem); alert("✅ Viagem Atualizada!"); } 
        else { dadosViagem.criado_em = serverTimestamp(); await addDoc(collection(db, "viagens"), dadosViagem); alert("✅ Nova Viagem Iniciada!"); }

        tripModal.classList.remove("active"); tripModal.classList.add("hidden");
        carregarHistoricoCompleto(placaAtual); // Atualiza tela 1
        carregarGestaoMotoristas(); // Atualiza tela 2 em segundo plano
    } catch (err) { alert("Erro ao salvar."); console.error(err); } 
    finally { btn.disabled = false; btn.innerText = "💾 Salvar Viagem"; }
});

document.getElementById("fuel-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); const btn = document.getElementById("btn-save-fuel"); btn.disabled = true;
    try {
        await addDoc(collection(db, "abastecimentos"), { veiculo_id: placaAtual, data: document.getElementById("fuel-data").value, km_hodometro: parseFloat(document.getElementById("fuel-km").value), litros: parseFloat(document.getElementById("fuel-litros").value), valor_total: parseFloat(document.getElementById("fuel-valor").value) });
        document.getElementById("fuel-form").reset(); fuelModal.classList.remove("active"); fuelModal.classList.add("hidden"); carregarHistoricoCompleto(placaAtual);
    } catch (err) { alert("Erro."); } finally { btn.disabled = false; }
});

document.getElementById("maint-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); const btn = document.getElementById("btn-save-maint"); btn.disabled = true;
    try {
        await addDoc(collection(db, "manutencoes"), { veiculo_id: placaAtual, data: document.getElementById("maint-data").value, km_hodometro: parseFloat(document.getElementById("maint-km").value), servico: document.getElementById("maint-servico").value, oficina: document.getElementById("maint-oficina").value, valor_total: parseFloat(document.getElementById("maint-valor").value) });
        document.getElementById("maint-form").reset(); maintModal.classList.remove("active"); maintModal.classList.add("hidden"); carregarHistoricoCompleto(placaAtual);
    } catch (err) { alert("Erro."); } finally { btn.disabled = false; }
});

// === ABA 1: GERAR SANFONA DA FROTA ===
async function carregarHistoricoCompleto(placa) {
    const container = document.getElementById("accordion-container"); container.innerHTML = "<p class='loading-text'>Gerando Balanço...</p>";
    viagensCache = {}; 
    try {
        let historico = [];
        const snapViagens = await getDocs(query(collection(db, "viagens"), where("veiculo_id", "==", placa)));
        snapViagens.forEach(doc => { let d = doc.data(); d.id = doc.id; d.tipo = "viagem"; d.data_ordenacao = d.data_viagem; viagensCache[doc.id] = d; historico.push(d); });
        
        const snapAbast = await getDocs(query(collection(db, "abastecimentos"), where("veiculo_id", "==", placa)));
        snapAbast.forEach(doc => { let d = doc.data(); d.tipo = "abastecimento"; d.data_ordenacao = d.data; historico.push(d); });
        
        const snapManut = await getDocs(query(collection(db, "manutencoes"), where("veiculo_id", "==", placa)));
        snapManut.forEach(doc => { let d = doc.data(); d.tipo = "manutencao"; d.data_ordenacao = d.data; historico.push(d); });

        if (historico.length === 0) { container.innerHTML = `<p class='loading-text'>Nenhum registro.</p>`; return; }

        historico.sort((a, b) => new Date(b.data_ordenacao) - new Date(a.data_ordenacao));
        const mesesAgrupados = {}; const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        historico.forEach(item => {
            const dataObj = new Date(item.data_ordenacao + "T12:00:00"); 
            const mesAno = `${nomeMeses[dataObj.getMonth()]} ${dataObj.getFullYear()}`;
            const chaveOrdem = item.data_ordenacao.substring(0, 7); 
            if (!mesesAgrupados[chaveOrdem]) { mesesAgrupados[chaveOrdem] = { titulo: mesAno, itens: [], totais: { fretes: 0, despesas: 0, combustivel: 0, manutencao: 0, pedagio: 0 } }; }
            mesesAgrupados[chaveOrdem].itens.push(item);
            if (item.tipo === "viagem") { mesesAgrupados[chaveOrdem].totais.fretes += item.valores.frete_bruto || 0; mesesAgrupados[chaveOrdem].totais.despesas += item.valores.despesa_motorista || 0; mesesAgrupados[chaveOrdem].totais.pedagio += item.valores.despesa_pedagio || 0;
            } else if (item.tipo === "abastecimento") { mesesAgrupados[chaveOrdem].totais.combustivel += item.valor_total || 0;
            } else if (item.tipo === "manutencao") { mesesAgrupados[chaveOrdem].totais.manutencao += item.valor_total || 0; }
        });

        let html = ""; let isPrimeiroMes = true; 
        Object.keys(mesesAgrupados).sort((a, b) => b.localeCompare(a)).forEach(chave => {
            const grupo = mesesAgrupados[chave];
            const lucroLiquido = grupo.totais.fretes - grupo.totais.despesas - grupo.totais.pedagio - grupo.totais.combustivel - grupo.totais.manutencao;

            html += `<details class="month-group" ${isPrimeiroMes ? 'open' : ''}><summary class="month-title"><span>📅 ${grupo.titulo}</span><span style="font-size: 14px;">▼</span></summary><div class="month-content">`;

            grupo.itens.forEach((item) => {
                if (item.tipo === "viagem") {
                    let dests = Array.isArray(item.destinos) && item.destinos.length > 0 ? item.destinos.join(', ') : (item.destino || 'N/A');
                    let notas = Array.isArray(item.nfs) && item.nfs.length > 0 ? item.nfs.join(', ') : (item.numero_nf || 'S/N');
                    let statusColor = item.status === "Concluída" ? "#2ecc71" : "#f39c12";
                    let textoBotao = item.status === "Concluída" ? "🔍 Verificar Viagem" : "✏️ Atualizar Viagem";
                    
                    let despMotHtml = item.despesas_motoristas && item.despesas_motoristas.length > 0
                        ? item.despesas_motoristas.map(d => `<div style="padding-left: 10px; border-left: 2px solid ${d.status === 'Pago' ? '#2ecc71' : '#e74c3c'}; margin-top: 5px;"><strong>${d.nome}</strong>: VT R$${d.vt.toFixed(2)} | VA R$${d.va.toFixed(2)} | Diária R$${d.diaria.toFixed(2)} <span style="font-size:10px;">(${d.status || 'Aberto'})</span></div>`).join('')
                        : `<div style="padding-left: 10px; font-style: italic; color: #7f8c8d;">Despesa Base: R$ ${(item.valores.despesa_motorista || 0).toFixed(2)}</div>`;
                    let lucroViagem = item.valores.frete_bruto - (item.valores.despesa_motorista + item.valores.despesa_pedagio);

                    html += `
                    <details class="form-section" style="margin-bottom: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid ${statusColor};">
                        <summary style="font-weight: bold; padding: 12px; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                            <div><span style="font-size: 13px; color: #7f8c8d;">📅 ${item.data_ordenacao.split('-').reverse().join('/')}</span><br><span style="color: #2c3e50;">📍 ${item.origem} ➔ ${dests}</span></div>
                            <div style="text-align: right;"><span style="color: ${statusColor}; font-size: 16px;">${item.status}</span><div style="font-size: 10px; color: #95a5a6;">Frete: R$ ${item.valores.frete_bruto.toFixed(2)}</div></div>
                        </summary>
                        <div style="padding: 15px; border-top: 1px solid #eee; font-size: 14px; color: #34495e;">
                            <p>📦 <strong>NFs:</strong> ${notas}</p><p>📅 <strong>Entrega:</strong> ${item.data_entrega ? item.data_entrega.split('-').reverse().join('/') : 'Aguardando...'}</p>
                            <div style="margin: 10px 0;">👨‍✈️ <strong>Despesas Motoristas:</strong> ${despMotHtml}</div>
                            <p>📉 <strong>Gastos c/ Pedágio:</strong> R$ ${(item.valores.despesa_pedagio).toFixed(2)}</p><p>🛣️ <strong>Rodado:</strong> ${item.quilometragem.km_total} km</p>
                            <hr style="margin: 15px 0; border: 0; border-top: 2px dashed #bdc3c7;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><span style="color: #2c3e50; font-size: 15px;">Líquido da Viagem:</span><span style="font-size: 18px; font-weight: bold; color: ${lucroViagem >= 0 ? '#2ecc71' : '#e74c3c'};">R$ ${lucroViagem.toFixed(2)}</span></div>
                            <button class="btn-edit btn-edit-trip" data-id="${item.id}" style="background-color: ${statusColor}; width: 100%; border-radius: 6px;">${textoBotao}</button>
                        </div>
                    </details>`;
                } 
                else if (item.tipo === "abastecimento") { html += `<details class="form-section" style="margin-bottom: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid #f39c12;"><summary style="font-weight: bold; padding: 12px; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;"><div><span style="font-size: 13px; color: #7f8c8d;">📅 ${item.data_ordenacao.split('-').reverse().join('/')}</span><br><span style="color: #e67e22;">⛽ Abastecimento</span></div><div style="text-align: right;"><span style="color: #e74c3c; font-size: 16px;">➖ R$ ${item.valor_total.toFixed(2)}</span></div></summary></details>`; }
                else if (item.tipo === "manutencao") { html += `<details class="form-section" style="margin-bottom: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid #d35400;"><summary style="font-weight: bold; padding: 12px; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;"><div><span style="font-size: 13px; color: #7f8c8d;">📅 ${item.data_ordenacao.split('-').reverse().join('/')}</span><br><span style="color: #d35400;">🔧 Oficina</span></div><div style="text-align: right;"><span style="color: #e74c3c; font-size: 16px;">➖ R$ ${item.valor_total.toFixed(2)}</span></div></summary></details>`; }
            });

            html += `
            <div class="monthly-summary-card">
                <h5>📊 Fechamento de ${grupo.titulo.split(' ')[0]}</h5>
                <div class="summary-row"><span>(+) Frete Bruto:</span> <span>R$ ${grupo.totais.fretes.toFixed(2)}</span></div>
                <div class="summary-row" style="color:#e74c3c;"><span>(-) Motoristas (VA/VT/Diária):</span> <span>R$ ${grupo.totais.despesas.toFixed(2)}</span></div>
                <div class="summary-row" style="color:#e74c3c;"><span>(-) Gastos c/ Pedágio:</span> <span>R$ ${grupo.totais.pedagio.toFixed(2)}</span></div>
                <div class="summary-row" style="color:#e74c3c;"><span>(-) Combustível:</span> <span>R$ ${grupo.totais.combustivel.toFixed(2)}</span></div>
                <div class="summary-row" style="color:#e74c3c;"><span>(-) Manutenções:</span> <span>R$ ${grupo.totais.manutencao.toFixed(2)}</span></div>
                <hr>
                <div class="summary-row total-row ${lucroLiquido >= 0 ? 'positive' : 'negative'}"><span>LÍQUIDO MENSAL:</span> <span>R$ ${lucroLiquido.toFixed(2)}</span></div>
            </div></div></details>`; 
            isPrimeiroMes = false; 
        });
        container.innerHTML = html;
    } catch (error) { container.innerHTML = "<p style='color: red;'>Erro.</p>"; }
}

// === ABA 2: O CÉREBRO DA GESTÃO DE MOTORISTAS ===
async function carregarGestaoMotoristas() {
    const container = document.getElementById("motoristas-container");
    container.innerHTML = "<p class='loading-text'>Gerando cruzamento de dados...</p>";
    
    try {
        const snapViagens = await getDocs(collection(db, "viagens")); 
        const mesesAgrupados = {};
        const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        snapViagens.forEach(docSnap => {
            const viagem = docSnap.data();
            const tripId = docSnap.id;
            if (!viagem.despesas_motoristas || viagem.despesas_motoristas.length === 0) return;

            const dataObj = new Date(viagem.data_viagem + "T12:00:00");
            const mesAno = `${nomeMeses[dataObj.getMonth()]} ${dataObj.getFullYear()}`;
            const chaveOrdem = viagem.data_viagem.substring(0, 7); 

            if (!mesesAgrupados[chaveOrdem]) { mesesAgrupados[chaveOrdem] = { titulo: mesAno, motoristas: {} }; }
            
            viagem.despesas_motoristas.forEach(desp => {
                if (!mesesAgrupados[chaveOrdem].motoristas[desp.nome]) {
                    mesesAgrupados[chaveOrdem].motoristas[desp.nome] = { aberto: 0, pago: 0, itens: [] };
                }
                
                const totalDesp = desp.vt + desp.va + desp.diaria;
                if (desp.status === "Pago") { mesesAgrupados[chaveOrdem].motoristas[desp.nome].pago += totalDesp; } 
                else { mesesAgrupados[chaveOrdem].motoristas[desp.nome].aberto += totalDesp; }

                mesesAgrupados[chaveOrdem].motoristas[desp.nome].itens.push({
                    tripId: tripId, despesaId: desp.id_despesa, data: viagem.data_viagem, origem: viagem.origem,
                    destinos: Array.isArray(viagem.destinos) && viagem.destinos.length > 0 ? viagem.destinos.join(', ') : (viagem.destino || 'N/A'),
                    placa: viagem.veiculo_id, vt: desp.vt, va: desp.va, diaria: desp.diaria, total: totalDesp, status: desp.status || "Aberto"
                });
            });
        });

        let html = ""; let isPrimeiroMes = true;
        Object.keys(mesesAgrupados).sort((a, b) => b.localeCompare(a)).forEach(chave => {
            const grupo = mesesAgrupados[chave];
            html += `<details class="month-group" ${isPrimeiroMes ? 'open' : ''}><summary class="month-title"><span>📅 ${grupo.titulo}</span><span style="font-size: 14px;">▼</span></summary><div class="month-content">`;

            Object.keys(grupo.motoristas).sort().forEach(nomeMot => {
                const motData = grupo.motoristas[nomeMot];
                html += `
                <div class="driver-card">
                    <div class="driver-header">
                        <div class="driver-name">👨‍✈️ ${nomeMot}</div>
                        <div class="driver-totals">
                            <span class="tot-pago">Pago: R$ ${motData.pago.toFixed(2)}</span>
                            <span class="tot-aberto">Aberto: R$ ${motData.aberto.toFixed(2)}</span>
                        </div>
                    </div><div>`;
                
                motData.itens.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(item => {
                    let statusClass = item.status === "Pago" ? "status-pago" : "status-aberto";
                    let btnClass = item.status === "Pago" ? "btn-status-pago" : "btn-status-aberto";
                    let btnText = item.status === "Pago" ? "✓ Pago" : "Pagar";
                    
                    html += `
                    <div class="despesa-item ${statusClass}">
                        <div style="flex: 1;">
                            <div style="font-size: 11px; color: #7f8c8d;">📅 ${item.data.split('-').reverse().join('/')} | 🚛 ${item.placa}</div>
                            <div style="font-size: 14px; color: #2c3e50; font-weight: bold;">${item.origem} ➔ ${item.destinos}</div>
                            <div style="font-size: 11px; color: #555; margin-top: 4px;">VT: R$${item.vt.toFixed(2)} | VA: R$${item.va.toFixed(2)} | Diária: R$${item.diaria.toFixed(2)}</div>
                        </div>
                        <div style="text-align: right; min-width: 90px;">
                            <div style="font-size: 15px; font-weight: bold; margin-bottom: 5px;">R$ ${item.total.toFixed(2)}</div>
                            <button class="btn-toggle-status ${btnClass}" onclick="toggleStatusPagamento('${item.tripId}', '${item.despesaId}', '${item.nome}', ${item.total}, '${item.status}')">${btnText}</button>
                        </div>
                    </div>`;
                });
                html += `</div></div>`;
            });
            html += `</div></details>`;
            isPrimeiroMes = false;
        });

        if(html === "") html = "<p class='loading-text'>Nenhuma despesa de motorista encontrada.</p>";
        container.innerHTML = html;
    } catch (error) { console.error(error); container.innerHTML = "<p style='color: red;'>Erro ao carregar dados.</p>"; }
}

// === GATILHO DUPLO: MUDAR STATUS DE PAGAMENTO COM TRAVA DE SEGURANÇA ===
window.toggleStatusPagamento = async (tripId, despesaId, nomeMotorista, valorTotal, statusAtual) => {
    
    // A TRAVA ANTI-DESFALQUE
    const isPago = statusAtual === "Pago";
    const mensagemConfirmacao = isPago 
        ? `⚠️ ATENÇÃO: Você está prestes a ESTORNAR o pagamento de ${nomeMotorista} no valor de R$ ${valorTotal.toFixed(2)}.\n\nTem certeza que deseja REABRIR esta conta?` 
        : `Confirmar o PAGAMENTO de R$ ${valorTotal.toFixed(2)} para ${nomeMotorista}?`;

    if (!confirm(mensagemConfirmacao)) {
        return; // Aborta a operação se o usuário clicar em Cancelar
    }

    try {
        const docRef = doc(db, "viagens", tripId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;

        let viagem = docSnap.data();
        let despIndex = viagem.despesas_motoristas.findIndex(d => d.id_despesa === despesaId);
        
        if (despIndex > -1) {
            // Inverte o status
            viagem.despesas_motoristas[despIndex].status = isPago ? "Aberto" : "Pago";
            // Salva na nuvem
            await updateDoc(docRef, { despesas_motoristas: viagem.despesas_motoristas });
            
            // Atualiza a tela dos motoristas para refletir os novos totais na hora
            carregarGestaoMotoristas(); 
            // Se o gestor também estiver com um caminhão aberto na outra aba, recarrega ele lá também
            if(!document.getElementById("panel-veiculo").classList.contains("hidden") && placaAtual) {
                carregarHistoricoCompleto(placaAtual); 
            }
        }
    } catch(err) { alert("Erro ao atualizar status: " + err.message); }
};

// === ABRIR EDIÇÃO ===
document.getElementById("accordion-container").addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-edit-trip")) { abrirEdicaoViagem(e.target.getAttribute("data-id")); }
});

function abrirEdicaoViagem(id) {
    const dados = viagensCache[id]; if(!dados) return;
    resetarFormularioViagem(); 
    document.getElementById("edit-trip-id").value = id;
    document.getElementById("trip-modal-title").innerHTML = `Atualizar Viagem - <span class="placa-label">${placaAtual}</span>`;
    
    document.getElementById("data_viagem").value = dados.data_viagem || ""; document.getElementById("data_entrega").value = dados.data_entrega || "";
    document.getElementById("origem").value = dados.origem || ""; document.getElementById("observacoes").value = dados.observacoes || "";
    
    destinosArray = Array.isArray(dados.destinos) ? [...dados.destinos] : (dados.destino ? [dados.destino] : []);
    nfsArray = Array.isArray(dados.nfs) ? [...dados.nfs] : (dados.numero_nf ? [dados.numero_nf] : []);
    
    despMotArray = Array.isArray(dados.despesas_motoristas) ? [...dados.despesas_motoristas] : [];
    if (despMotArray.length === 0 && dados.valores && dados.valores.despesa_motorista > 0) {
        despMotArray.push({ id_despesa: "legado_" + Date.now(), nome: "Motorista (Legado)", vt: 0, va: 0, diaria: dados.valores.despesa_motorista, status: "Pago" });
    }
    renderizarListas();

    document.getElementById("valor_frete").value = dados.valores.frete_bruto || ""; 
    document.getElementById("desp_pedagio").value = dados.valores.despesa_pedagio || "";
    document.getElementById("km_inicio").value = dados.quilometragem.km_inicio || ""; document.getElementById("km_final").value = dados.quilometragem.km_final || "";

    if (dados.audios && dados.audios.length > 0) { audiosExistentes = [...dados.audios]; } else if (dados.audio_url) { audiosExistentes = [dados.audio_url]; }
    renderizarAudiosNaTela();
    atualizarTotais(); calcularKm(); 
    
    document.getElementById("btn-save-trip").innerText = dados.status === "Concluída" ? "💾 Salvar Verificação" : "🔄 Atualizar Viagem";
    tripModal.classList.remove("hidden"); tripModal.classList.add("active");
}
