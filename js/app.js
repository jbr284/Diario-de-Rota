import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

// === ELEMENTOS DA INTERFACE ===
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const btnLogin = document.getElementById("btn-login");
let placaAtual = "";

// === 1. CONTROLADOR CENTRAL DE TELAS ===
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        document.getElementById("user-greeting").innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
        // Não carrega a lista logo de cara, pede para selecionar o caminhão primeiro.
        document.getElementById("accordion-container").innerHTML = "<p class='loading-text'>Selecione um caminhão acima para carregar as viagens.</p>";
    } else {
        dashboardView.classList.add("hidden");
        loginView.classList.remove("hidden");
    }
});

// === 2. LOGIN E LOGOUT ===
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;

        try {
            btnLogin.innerText = "Aguarde...";
            btnLogin.disabled = true;
            await signInWithEmailAndPassword(auth, email, senha);
        } catch (erro) {
            console.error("Erro no login:", erro);
            alert("E-mail ou senha incorretos.");
        } finally {
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.disabled = false;
        }
    });
}

document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await signOut(auth);
});

// === 3. SELEÇÃO DO CAMINHÃO E ABERTURA DO MODAL ===
const modal = document.getElementById("trip-modal");
const actionArea = document.getElementById("action-area");
const historyTitle = document.getElementById("history-title");

document.querySelectorAll(".truck-card").forEach(button => {
    button.addEventListener("click", (e) => {
        // 1. Remove o destaque de todos os botões e aplica só no clicado
        document.querySelectorAll(".truck-card").forEach(btn => btn.classList.remove("active-truck"));
        e.currentTarget.classList.add("active-truck");

        // 2. Grava qual placa está selecionada
        placaAtual = e.currentTarget.getAttribute("data-placa");
        document.getElementById("placa-selecionada").innerText = placaAtual;
        historyTitle.innerText = `📄 Histórico - ${placaAtual}`;
        
        // 3. Mostra o botão verde de Nova Viagem
        actionArea.classList.remove("hidden");

        // 4. Vai no banco de dados buscar AS VIAGENS DAQUELA PLACA
        carregarHistoricoViagens(auth.currentUser.uid, placaAtual);
    });
});

// Clique no botão verde para abrir o formulário
document.getElementById("btn-open-modal")?.addEventListener("click", () => {
    modal.classList.remove("hidden");
    modal.classList.add("active");
});

document.getElementById("close-modal")?.addEventListener("click", () => {
    modal.classList.remove("active");
    modal.classList.add("hidden");
});

// === 4. MATEMÁTICA AUTOMÁTICA ===
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
        const comb = parseFloat(document.getElementById("desp_comb").value) || 0;
        const ped = parseFloat(document.getElementById("desp_pedagio").value) || 0;

        const despesas = mot + comb + ped;
        document.getElementById("total_despesas_display").innerText = despesas.toFixed(2);
        document.getElementById("total_liquido_display").innerText = (frete - despesas).toFixed(2);
    });
});

// === 5. SALVAR NO FIRESTORE ===
const tripForm = document.getElementById("trip-form");
if (tripForm) {
    tripForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        const btnSave = document.getElementById("btn-save-trip");
        try {
            btnSave.innerText = "Salvando...";
            btnSave.disabled = true;

            const novaViagem = {
                veiculo_id: placaAtual,
                motorista_uid: auth.currentUser.uid,
                data_viagem: document.getElementById("data_viagem").value,
                origem: document.getElementById("origem").value,
                destino: document.getElementById("destino").value,
                numero_nf: document.getElementById("nf").value,
                valores: {
                    total_despesas: parseFloat(document.getElementById("total_despesas_display").innerText),
                    total_liquido: parseFloat(document.getElementById("total_liquido_display").innerText)
                },
                quilometragem: { km_total: parseFloat(document.getElementById("km_total_display").innerText) },
                criado_em: serverTimestamp()
            };

            await addDoc(collection(db, "viagens"), novaViagem);
            alert("✅ Viagem salva com sucesso!");
            
            tripForm.reset();
            modal.classList.remove("active");
            modal.classList.add("hidden");
            
            // Atualiza o histórico mostrando a viagem que acabou de salvar
            carregarHistoricoViagens(auth.currentUser.uid, placaAtual); 

        } catch (error) {
            console.error("Erro ao salvar: ", error);
            alert("Erro ao salvar no banco de dados.");
        } finally {
            btnSave.innerText = "💾 Salvar Viagem";
            btnSave.disabled = false;
        }
    });
}

// === 6. BUSCAR HISTÓRICO FILTRADO ===
async function carregarHistoricoViagens(uid, placa) {
    const container = document.getElementById("accordion-container");
    container.innerHTML = "<p class='loading-text'>Buscando viagens...</p>";
    
    try {
        // Query Avançada: Filtra pelo motorista E pela placa selecionada
        const q = query(collection(db, "viagens"), 
            where("motorista_uid", "==", uid),
            where("veiculo_id", "==", placa)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = `<p class='loading-text'>Nenhuma viagem registrada para o caminhão ${placa}.</p>`;
            return;
        }

        let viagens = [];
        querySnapshot.forEach((doc) => viagens.push(doc.data()));
        // Ordena da mais recente para a mais antiga
        viagens.sort((a, b) => new Date(b.data_viagem) - new Date(a.data_viagem));

        let html = "";
        viagens.forEach((v) => {
            html += `
            <details class="form-section" style="margin-bottom: 10px; cursor: pointer; background: #fff;">
                <summary style="font-weight: bold; padding: 10px; outline: none;">
                    📅 ${v.data_viagem.split('-').reverse().join('/')} <br>
                    <span style="color: #2ecc71;">💰 LÍQUIDO: R$ ${v.valores.total_liquido.toFixed(2)}</span>
                </summary>
                <div style="padding: 10px; border-top: 1px solid #ddd; font-size: 14px;">
                    <p>📍 ${v.origem} ➔ ${v.destino}</p>
                    <p>📦 NF: ${v.numero_nf || 'S/N'}</p>
                    <p>📉 Despesas Totais: R$ ${v.valores.total_despesas.toFixed(2)}</p>
                    <p>🛣️ Km Rodado: ${v.quilometragem.km_total} km</p>
                </div>
            </details>`;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        container.innerHTML = "<p style='color: red; text-align: center;'>Erro ao carregar histórico.</p>";
    }
}
