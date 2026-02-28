import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const btnLogin = document.getElementById("btn-login");
let placaAtual = "";

let viagensCache = {}; 
let destinosArray = [];
let nfsArray = [];

// === 1. CONTROLADOR DE TELA ===
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        document.getElementById("user-greeting").innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
    } else {
        dashboardView.classList.add("hidden");
        loginView.classList.remove("hidden");
    }
});

// === 2. LOGIN E LOGOUT ===
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        btnLogin.innerText = "Aguarde..."; btnLogin.disabled = true;
        await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("senha").value);
    } catch (erro) { alert("E-mail ou senha incorretos."); } 
    finally { btnLogin.innerText = "Entrar no Sistema"; btnLogin.disabled = false; }
});
document.getElementById("btn-logout")?.addEventListener("click", () => signOut(auth));

// === 3. SELEÇÃO DO CAMINHÃO ===
const tripModal = document.getElementById("trip-modal");
const fuelModal = document.getElementById("fuel-modal");
const maintModal = document.getElementById("maint-modal");
const actionArea = document.getElementById("action-area");

document.querySelectorAll(".truck-card").forEach(button => {
    button.addEventListener("click", (e) => {
        document.querySelectorAll(".truck-card").forEach(btn => btn.classList.remove("active-truck"));
        e.currentTarget.classList.add("active-truck");
        placaAtual = e.currentTarget.getAttribute("data-placa");
        document.querySelectorAll(".placa-label").forEach(el => el.innerText = placaAtual);
        document.getElementById("history-title").innerText = `📄 Resumo Financeiro - ${placaAtual}`;
        actionArea.classList.remove("hidden");
        carregarHistoricoCompleto(auth.currentUser.uid, placaAtual);
    });
});

// Listas Dinâmicas (NFs e Destinos)
function renderizarListas() {
    document.getElementById("lista-destinos").innerHTML = destinosArray.map((d, index) => `<li>${d} <span onclick="removerDestino(${index})">&times;</span></li>`).join('');
    document.getElementById("lista-nfs").innerHTML = nfsArray.map((nf, index) => `<li>${nf} <span onclick="removerNf(${index})">&times;</span></li>`).join('');
}
window.removerDestino = (index) => { destinosArray.splice(index, 1); renderizarListas(); };
window.removerNf = (index) => { nfsArray.splice(index, 1); renderizarListas(); };

document.getElementById("btn-add-destino")?.addEventListener("click", () => {
    const input = document.getElementById("destino_input");
    if(input.value.trim() !== "") { destinosArray.push(input.value.trim()); input.value = ""; renderizarListas(); }
});
document.getElementById("btn-add-nf")?.addEventListener("click", () => {
    const input = document.getElementById("nf_input");
    if(input.value.trim() !== "") { nfsArray.push(input.value.trim()); input.value = ""; renderizarListas(); }
});

function resetarFormularioViagem() {
    document.getElementById("trip-form").reset();
    document.getElementById("edit-trip-id").value = "";
    document.getElementById("trip-modal-title").innerHTML = `Nova Viagem - <span class="placa-label">${placaAtual}</span>`;
    document.getElementById("btn-save-trip").innerText = "💾 Salvar Viagem";
    destinosArray = []; nfsArray = []; renderizarListas();
    document.getElementById("total_despesas_display").innerText = "0.00";
    document.getElementById("total_liquido_display").innerText = "0.00";
    document.getElementById("km_total_display").innerText = "0";
}

document.getElementById("btn-open-trip")?.addEventListener("click", () => { resetarFormularioViagem(); tripModal.classList.remove("hidden"); tripModal.classList.add("active"); });
document.getElementById("btn-open-fuel")?.addEventListener("click", () => { fuelModal.classList.remove("hidden"); fuelModal.classList.add("active"); });
document.getElementById("btn-open-maint")?.addEventListener("click", () => { maintModal.classList.remove("hidden"); maintModal.classList.add("active"); });

document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", (e) => { e.target.closest(".modal").classList.remove("active"); e.target.closest(".modal").classList.add("hidden"); });
});

// === 4. MATEMÁTICA AUTOMÁTICA ===
const atualizarTotais = () => {
    const frete = parseFloat(document.getElementById("valor_frete").value) || 0;
    const mot = parseFloat(document.getElementById("desp_mot").value) || 0;
    const ped = parseFloat(document.getElementById("desp_pedagio").value) || 0;
    const despesas = mot + ped;
    document.getElementById("total_despesas_display").innerText = despesas.toFixed(2);
    document.getElementById("total_liquido_display").innerText = (frete - despesas).toFixed(2);
};
document.querySelectorAll(".calc-input").forEach(input => input.addEventListener("input", atualizarTotais));

document.querySelectorAll(".calc-km").forEach(input => {
    input.addEventListener("input", () => {
        const inicio = parseFloat(document.getElementById("km_inicio").value) || 0;
        const final = parseFloat(document.getElementById("km_final").value) || 0;
        document.getElementById("km_total_display").innerText = final > inicio ? final - inicio : 0;
    });
});

// === 5. SALVAMENTO NO FIRESTORE ===
document.getElementById("trip-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!auth.currentUser) return;
    const btn = document.getElementById("btn-save-trip"); const editId = document.getElementById("edit-trip-id").value; btn.disabled = true;

    try {
        const dadosViagem = {
            veiculo_id: placaAtual, motorista_uid: auth.currentUser.uid,
            data_viagem: document.getElementById("data_viagem").value,
            data_entrega: document.getElementById("data_entrega").value,
            origem: document.getElementById("origem").value,
            destinos: destinosArray, nfs: nfsArray,
            valores: {
                frete_bruto: parseFloat(document.getElementById("valor_frete").value) || 0,
                despesa_motorista: parseFloat(document.getElementById("desp_mot").value) || 0,
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
        carregarHistoricoCompleto(auth.currentUser.uid, placaAtual);
    } catch (err) { alert("Erro ao salvar."); } finally { btn.disabled = false; }
});

document.getElementById("fuel-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!auth.currentUser) return; const btn = document.getElementById("btn-save-fuel"); btn.disabled = true;
    try {
        await addDoc(collection(db, "abastecimentos"), {
            veiculo_id: placaAtual, motorista_uid: auth.currentUser.uid, data: document.getElementById("fuel-data").value,
            km_hodometro: parseFloat(document.getElementById("fuel-km").value), litros: parseFloat(document.getElementById("fuel-litros").value),
            valor_total: parseFloat(document.getElementById("fuel-valor").value), criado_em: serverTimestamp()
        });
        document.getElementById("fuel-form").reset(); fuelModal.classList.remove("active"); fuelModal.classList.add("hidden");
        carregarHistoricoCompleto(auth.currentUser.uid, placaAtual);
    } catch (err) { alert("Erro ao salvar."); } finally { btn.disabled = false; }
});

document.getElementById("maint-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!auth.currentUser) return; const btn = document.getElementById("btn-save-maint"); btn.disabled = true;
    try {
        await addDoc(collection(db, "manutencoes"), {
            veiculo_id: placaAtual, motorista_uid: auth.currentUser.uid, data: document.getElementById("maint-data").value,
            km_hodometro: parseFloat(document.getElementById("maint-km").value), servico: document.getElementById("maint-servico").value,
            oficina: document.getElementById("maint-oficina").value, valor_total: parseFloat(document.getElementById("maint-valor").value), criado_em: serverTimestamp()
        });
        document.getElementById("maint-form").reset(); maintModal.classList.remove("active"); maintModal.classList.add("hidden");
        carregarHistoricoCompleto(auth.currentUser.uid, placaAtual);
    } catch (err) { alert("Erro ao salvar."); } finally { btn.disabled = false; }
});


// === 6. FASE 3: O CÉREBRO DO FECHAMENTO MENSAL ===
async function carregarHistoricoCompleto(uid, placa) {
    const container = document.getElementById("accordion-container");
    container.innerHTML = "<p class='loading-text'>Gerando Balanço Financeiro...</p>";
    viagensCache = {}; 
    
    try {
        let historico = [];

        // Coleta todos os dados do banco
        const snapViagens = await getDocs(query(collection(db, "viagens"), where("motorista_uid", "==", uid), where("veiculo_id", "==", placa)));
        snapViagens.forEach(doc => { let d = doc.data(); d.id = doc.id; d.tipo = "viagem"; d.data_ordenacao = d.data_viagem; viagensCache[doc.id] = d; historico.push(d); });

        const snapAbast = await getDocs(query(collection(db, "abastecimentos"), where("motorista_uid", "==", uid), where("veiculo_id", "==", placa)));
        snapAbast.forEach(doc => { let d = doc.data(); d.tipo = "abastecimento"; d.data_ordenacao = d.data; historico.push(d); });

        const snapManut = await getDocs(query(collection(db, "manutencoes"), where("motorista_uid", "==", uid), where("veiculo_id", "==", placa)));
        snapManut.forEach(doc => { let d = doc.data(); d.tipo = "manutencao"; d.data_ordenacao = d.data; historico.push(d); });

        if (historico.length === 0) { container.innerHTML = `<p class='loading-text'>Nenhum registro para ${placa}.</p>`; return; }

        // Organiza do mais novo para o mais antigo
        historico.sort((a, b) => new Date(b.data_ordenacao) - new Date(a.data_ordenacao));

        // MÁGICA DE AGRUPAMENTO POR MÊS
        const mesesAgrupados = {};
        const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        historico.forEach(item => {
            // Usa "T12:00:00" para evitar bugs de fuso horário brasileiro que jogam o dia para trás
            const dataObj = new Date(item.data_ordenacao + "T12:00:00"); 
            const mesAno = `${nomeMeses[dataObj.getMonth()]} ${dataObj.getFullYear()}`;
            const chaveOrdem = item.data_ordenacao.substring(0, 7); // Ex: "2026-02"

            if (!mesesAgrupados[chaveOrdem]) {
                mesesAgrupados[chaveOrdem] = { titulo: mesAno, itens: [], totais: { fretes: 0, despesas: 0, combustivel: 0, manutencao: 0 } };
            }

            mesesAgrupados[chaveOrdem].itens.push(item);

            // Soma da Contabilidade do Mês
            if (item.tipo === "viagem") {
                mesesAgrupados[chaveOrdem].totais.fretes += item.valores.frete_bruto || 0;
                mesesAgrupados[chaveOrdem].totais.despesas += (item.valores.despesa_motorista || 0) + (item.valores.despesa_pedagio || 0);
            } else if (item.tipo === "abastecimento") {
                mesesAgrupados[chaveOrdem].totais.combustivel += item.valor_total || 0;
            } else if (item.tipo === "manutencao") {
                mesesAgrupados[chaveOrdem].totais.manutencao += item.valor_total || 0;
            }
        });

        // GERAÇÃO VISUAL DO HTML SEPARADO POR MÊS
        let html = "";
        
        // Renderiza os meses (do mais recente para o mais antigo)
        Object.keys(mesesAgrupados).sort((a, b) => b.localeCompare(a)).forEach(chave => {
            const grupo = mesesAgrupados[chave];
            const lucroLiquido = grupo.totais.fretes - grupo.totais.despesas - grupo.totais.combustivel - grupo.totais.manutencao;

            html += `<div class="month-group">`;
            html += `<h4 class="month-title">📅 ${grupo.titulo}</h4>`;

            // Renderiza os cartões dentro deste mês
            grupo.itens.forEach((item) => {
                if (item.tipo === "viagem") {
                    let dests = Array.isArray(item.destinos) && item.destinos.length > 0 ? item.destinos.join(', ') : (item.destino || 'N/A');
                    let notas = Array.isArray(item.nfs) && item.nfs.length > 0 ? item.nfs.join(', ') : (item.numero_nf || 'S/N');
                    let statusColor = item.status === "Concluída" ? "#2ecc71" : "#f39c12";

                    html += `
                    <details class="form-section" style="margin-bottom: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid ${statusColor};">
                        <summary style="font-weight: bold; padding: 12px; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                            <div><span style="font-size: 13px; color: #7f8c8d;">📅 ${item.data_ordenacao.split('-').reverse().join('/')}</span><br>
                            <span style="color: #2c3e50;">📍 ${item.origem} ➔ ${dests}</span></div>
                            <div style="text-align: right;"><span style="color: ${statusColor}; font-size: 16px;">${item.status}</span>
                            <div style="font-size: 10px; color: #95a5a6;">Frete: R$ ${item.valores.frete_bruto.toFixed(2)}</div></div>
                        </summary>
                        <div style="padding: 15px; border-top: 1px solid #eee; font-size: 14px; color: #34495e;">
                            <p>📦 <strong>NFs:</strong> ${notas}</p>
                            <p>📅 <strong>Entrega:</strong> ${item.data_entrega ? item.data_entrega.split('-').reverse().join('/') : 'Aguardando...'}</p>
                            <p>📉 <strong>Despesas Viagem:</strong> R$ ${(item.valores.despesa_motorista + item.valores.despesa_pedagio).toFixed(2)}</p>
                            <p>🛣️ <strong>Rodado:</strong> ${item.quilometragem.km_total} km</p>
                            <button class="btn-edit btn-edit-trip" data-id="${item.id}">✏️ Editar Viagem</button>
                        </div>
                    </details>`;
                } 
                else if (item.tipo === "abastecimento") {
                    html += `
                    <details class="form-section" style="margin-bottom: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid #f39c12;">
                        <summary style="font-weight: bold; padding: 12px; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                            <div><span style="font-size: 13px; color: #7f8c8d;">📅 ${item.data_ordenacao.split('-').reverse().join('/')}</span><br><span style="color: #e67e22;">⛽ Abastecimento</span></div>
                            <div style="text-align: right;"><span style="color: #e74c3c; font-size: 16px;">➖ R$ ${item.valor_total.toFixed(2)}</span><div style="font-size: 10px; color: #95a5a6;">(${item.litros} L)</div></div>
                        </summary>
                    </details>`;
                }
                else if (item.tipo === "manutencao") {
                    html += `
                    <details class="form-section" style="margin-bottom: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 4px solid #d35400;">
                        <summary style="font-weight: bold; padding: 12px; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                            <div><span style="font-size: 13px; color: #7f8c8d;">📅 ${item.data_ordenacao.split('-').reverse().join('/')}</span><br><span style="color: #d35400;">🔧 Oficina</span></div>
                            <div style="text-align: right;"><span style="color: #e74c3c; font-size: 16px;">➖ R$ ${item.valor_total.toFixed(2)}</span><div style="font-size: 10px; color: #95a5a6;">(${item.servico})</div></div>
                        </summary>
                    </details>`;
                }
            });

            // Adiciona o Resumo Financeiro (O Fechamento) no final do mês
            html += `
            <div class="monthly-summary-card">
                <h5>📊 Fechamento de ${grupo.titulo.split(' ')[0]}</h5>
                <div class="summary-row"><span>(+) Fretes Brutos:</span> <span>R$ ${grupo.totais.fretes.toFixed(2)}</span></div>
                <div class="summary-row" style="color:#e74c3c;"><span>(-) Despesas de Viagem:</span> <span>R$ ${grupo.totais.despesas.toFixed(2)}</span></div>
                <div class="summary-row" style="color:#e74c3c;"><span>(-) Combustível:</span> <span>R$ ${grupo.totais.combustivel.toFixed(2)}</span></div>
                <div class="summary-row" style="color:#e74c3c;"><span>(-) Manutenções:</span> <span>R$ ${grupo.totais.manutencao.toFixed(2)}</span></div>
                <hr>
                <div class="summary-row total-row ${lucroLiquido >= 0 ? 'positive' : 'negative'}">
                    <span>LÍQUIDO MENSAL:</span> <span>R$ ${lucroLiquido.toFixed(2)}</span>
                </div>
            </div>`;

            html += `</div>`; // Fecha a Div do Mês
        });
        
        container.innerHTML = html;
    } catch (error) { console.error(error); container.innerHTML = "<p style='color: red;'>Erro ao gerar balanço financeiro.</p>"; }
}

// === EDIÇÃO (Clique no botão de editar viagem) ===
document.getElementById("accordion-container").addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-edit-trip")) { abrirEdicaoViagem(e.target.getAttribute("data-id")); }
});

function abrirEdicaoViagem(id) {
    const dados = viagensCache[id]; if(!dados) return;

    document.getElementById("edit-trip-id").value = id;
    document.getElementById("trip-modal-title").innerHTML = `Atualizar Viagem - <span class="placa-label">${placaAtual}</span>`;
    
    document.getElementById("data_viagem").value = dados.data_viagem || ""; document.getElementById("data_entrega").value = dados.data_entrega || "";
    document.getElementById("origem").value = dados.origem || "";
    destinosArray = Array.isArray(dados.destinos) ? [...dados.destinos] : (dados.destino ? [dados.destino] : []);
    nfsArray = Array.isArray(dados.nfs) ? [...dados.nfs] : (dados.numero_nf ? [dados.numero_nf] : []);
    renderizarListas();

    document.getElementById("valor_frete").value = dados.valores.frete_bruto || ""; document.getElementById("desp_mot").value = dados.valores.despesa_motorista || "";
    document.getElementById("desp_pedagio").value = dados.valores.despesa_pedagio || "";
    document.getElementById("km_inicio").value = dados.quilometragem.km_inicio || ""; document.getElementById("km_final").value = dados.quilometragem.km_final || "";

    atualizarTotais(); document.getElementById("btn-save-trip").innerText = "🔄 Atualizar Viagem";
    tripModal.classList.remove("hidden"); tripModal.classList.add("active");
}
