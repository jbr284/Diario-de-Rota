import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const btnLogin = document.getElementById("btn-login");
let placaAtual = "";

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
        btnLogin.innerText = "Aguarde...";
        btnLogin.disabled = true;
        await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("senha").value);
    } catch (erro) {
        alert("E-mail ou senha incorretos.");
    } finally {
        btnLogin.innerText = "Entrar no Sistema";
        btnLogin.disabled = false;
    }
});

document.getElementById("btn-logout")?.addEventListener("click", () => signOut(auth));

// === 3. SELEÇÃO DO CAMINHÃO E CONTROLE DOS 3 MODAIS ===
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
        document.getElementById("history-title").innerText = `📄 Histórico - ${placaAtual}`;
        
        actionArea.classList.remove("hidden");
        carregarHistoricoViagens(auth.currentUser.uid, placaAtual);
    });
});

// Abrir Modais
document.getElementById("btn-open-trip")?.addEventListener("click", () => { tripModal.classList.remove("hidden"); tripModal.classList.add("active"); });
document.getElementById("btn-open-fuel")?.addEventListener("click", () => { fuelModal.classList.remove("hidden"); fuelModal.classList.add("active"); });
document.getElementById("btn-open-maint")?.addEventListener("click", () => { maintModal.classList.remove("hidden"); maintModal.classList.add("active"); });

// Fechar Qualquer Modal
document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.target.closest(".modal").classList.remove("active");
        e.target.closest(".modal").classList.add("hidden");
    });
});

// === 4. MATEMÁTICA AUTOMÁTICA (APENAS VIAGEM AGORA) ===
document.querySelectorAll(".calc-km").forEach(input => {
    input.addEventListener("input", () => {
        const inicio = parseFloat(document.getElementById("km_inicio").value) || 0;
        const final = parseFloat(document.getElementById("km_final").value) || 0;
        document.getElementById("km_total_display").innerText = final > inicio ? final - inicio : 0;
    });
});

document.querySelectorAll(".calc-input").forEach(input => {
    input.addEventListener("input", () => {
        const frete = parseFloat(document.getElementById("valor_frete").value) || 0;
        const mot = parseFloat(document.getElementById("desp_mot").value) || 0;
        const ped = parseFloat(document.getElementById("desp_pedagio").value) || 0; // Removido comb

        const despesas = mot + ped;
        document.getElementById("total_despesas_display").innerText = despesas.toFixed(2);
        document.getElementById("total_liquido_display").innerText = (frete - despesas).toFixed(2);
    });
});

// === 5A. SALVAR VIAGEM (SEM COMBUSTÍVEL) ===
document.getElementById("trip-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const btn = document.getElementById("btn-save-trip");
    btn.disabled = true;

    try {
        await addDoc(collection(db, "viagens"), {
            veiculo_id: placaAtual,
            motorista_uid: auth.currentUser.uid,
            data_viagem: document.getElementById("data_viagem").value,
            origem: document.getElementById("origem").value,
            destino: document.getElementById("destino").value,
            numero_nf: document.getElementById("nf").value,
            valores: {
                frete_bruto: parseFloat(document.getElementById("valor_frete").value) || 0,
                despesa_motorista: parseFloat(document.getElementById("desp_mot").value) || 0,
                despesa_pedagio: parseFloat(document.getElementById("desp_pedagio").value) || 0,
                total_despesas: parseFloat(document.getElementById("total_despesas_display").innerText),
                total_liquido: parseFloat(document.getElementById("total_liquido_display").innerText)
            },
            quilometragem: { km_inicio: parseFloat(document.getElementById("km_inicio").value) || 0, km_final: parseFloat(document.getElementById("km_final").value) || 0, km_total: parseFloat(document.getElementById("km_total_display").innerText) },
            status: "criada",
            criado_em: serverTimestamp()
        });
        alert("✅ Viagem salva!");
        document.getElementById("trip-form").reset();
        tripModal.classList.remove("active"); tripModal.classList.add("hidden");
        carregarHistoricoViagens(auth.currentUser.uid, placaAtual);
    } catch (err) { alert("Erro ao salvar."); } finally { btn.disabled = false; }
});

// === 5B. SALVAR ABASTECIMENTO (NOVA COLEÇÃO) ===
document.getElementById("fuel-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const btn = document.getElementById("btn-save-fuel");
    btn.disabled = true;

    try {
        await addDoc(collection(db, "abastecimentos"), {
            veiculo_id: placaAtual,
            motorista_uid: auth.currentUser.uid,
            data: document.getElementById("fuel-data").value,
            km_hodometro: parseFloat(document.getElementById("fuel-km").value),
            litros: parseFloat(document.getElementById("fuel-litros").value),
            valor_total: parseFloat(document.getElementById("fuel-valor").value),
            criado_em: serverTimestamp()
        });
        alert("⛽ Abastecimento registrado!");
        document.getElementById("fuel-form").reset();
        fuelModal.classList.remove("active"); fuelModal.classList.add("hidden");
    } catch (err) { alert("Erro ao salvar."); } finally { btn.disabled = false; }
});

// === 5C. SALVAR MANUTENÇÃO (NOVA COLEÇÃO) ===
document.getElementById("maint-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const btn = document.getElementById("btn-save-maint");
    btn.disabled = true;

    try {
        await addDoc(collection(db, "manutencoes"), {
            veiculo_id: placaAtual,
            motorista_uid: auth.currentUser.uid,
            data: document.getElementById("maint-data").value,
            km_hodometro: parseFloat(document.getElementById("maint-km").value),
            servico: document.getElementById("maint-servico").value,
            oficina: document.getElementById("maint-oficina").value,
            valor_total: parseFloat(document.getElementById("maint-valor").value),
            criado_em: serverTimestamp()
        });
        alert("🔧 Manutenção registrada!");
        document.getElementById("maint-form").reset();
        maintModal.classList.remove("active"); maintModal.classList.add("hidden");
    } catch (err) { alert("Erro ao salvar."); } finally { btn.disabled = false; }
});

// === 6. BUSCAR HISTÓRICO (SOMENTE VIAGENS POR ENQUANTO) ===
async function carregarHistoricoViagens(uid, placa) {
    const container = document.getElementById("accordion-container");
    container.innerHTML = "<p class='loading-text'>Buscando viagens...</p>";
    
    try {
        const q = query(collection(db, "viagens"), where("motorista_uid", "==", uid), where("veiculo_id", "==", placa));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) { container.innerHTML = `<p class='loading-text'>Nenhuma viagem para ${placa}.</p>`; return; }

        let viagens = [];
        querySnapshot.forEach((doc) => viagens.push(doc.data()));
        viagens.sort((a, b) => new Date(b.data_viagem) - new Date(a.data_viagem));

        let html = "";
        viagens.forEach((v) => {
            html += `
            <details class="form-section" style="margin-bottom: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <summary style="font-weight: bold; padding: 12px; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    <div><span style="font-size: 13px; color: #7f8c8d;">📅 ${v.data_viagem.split('-').reverse().join('/')}</span><br>
                    <span style="color: #2c3e50;">📍 ${v.origem} ➔ ${v.destino}</span></div>
                    <div style="text-align: right;"><span style="color: #2ecc71; font-size: 16px;">💰 R$ ${v.valores.total_liquido.toFixed(2)}</span>
                    <div style="font-size: 10px; color: #95a5a6;">(Frete Liq)</div></div>
                </summary>
            </details>`;
        });
        container.innerHTML = html;
    } catch (error) { container.innerHTML = "<p style='color: red;'>Erro ao carregar histórico.</p>"; }
}
