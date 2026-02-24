import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

// === ELEMENTOS DA INTERFACE ===
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const btnLogin = document.getElementById("btn-login");
let placaAtual = "";

// === 1. CONTROLADOR CENTRAL DE TELAS (O CORAÇÃO DA SPA) ===
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado: Esconde login, Mostra painel
        loginView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        
        document.getElementById("user-greeting").innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
        carregarHistoricoViagens(user.uid); // Busca os dados no banco
    } else {
        // Deslogado: Esconde painel, Mostra login
        dashboardView.classList.add("hidden");
        loginView.classList.remove("hidden");
    }
});

// === 2. LOGIN E LOGOUT ===
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {
        btnLogin.innerText = "Aguarde...";
        btnLogin.disabled = true;
        await signInWithEmailAndPassword(auth, email, senha);
        // O onAuthStateChanged vai detectar e trocar a tela automaticamente!
    } catch (erro) {
        console.error("Erro no login:", erro);
        alert("E-mail ou senha incorretos.");
    } finally {
        btnLogin.innerText = "Entrar no Sistema";
        btnLogin.disabled = false;
    }
});

document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await signOut(auth); // O onAuthStateChanged vai jogar para a tela de login
});

// === 3. CONTROLE DO MODAL DE VIAGEM ===
const modal = document.getElementById("trip-modal");
document.querySelectorAll(".truck-card").forEach(button => {
    button.addEventListener("click", (e) => {
        placaAtual = e.currentTarget.getAttribute("data-placa");
        document.getElementById("placa-selecionada").innerText = placaAtual;
        modal.classList.remove("hidden");
    });
});

document.getElementById("close-modal")?.addEventListener("click", () => {
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
document.getElementById("trip-form")?.addEventListener("submit", async (e) => {
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
        
        document.getElementById("trip-form").reset();
        modal.classList.add("hidden");
        carregarHistoricoViagens(auth.currentUser.uid); // Atualiza a tela

    } catch (error) {
        console.error("Erro ao salvar: ", error);
        alert("Erro ao salvar! Verifique as regras de segurança do Firestore no console do Firebase.");
    } finally {
        btnSave.innerText = "💾 Salvar Viagem";
        btnSave.disabled = false;
    }
});

// === 6. BUSCAR HISTÓRICO ===
async function carregarHistoricoViagens(uid) {
    const container = document.getElementById("accordion-container");
    try {
        const q = query(collection(db, "viagens"), where("motorista_uid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = "<p class='loading-text'>Nenhuma viagem registrada.</p>";
            return;
        }

        let html = "";
        querySnapshot.forEach((doc) => {
            const v = doc.data();
            html += `
            <details class="form-section" style="margin-bottom: 10px; cursor: pointer; background: #fff;">
                <summary style="font-weight: bold; padding: 10px;">
                    📅 ${v.data_viagem} | 🚚 ${v.veiculo_id} <br>
                    <span style="color: #2ecc71;">💰 LÍQUIDO: R$ ${v.valores.total_liquido.toFixed(2)}</span>
                </summary>
                <div style="padding: 10px; border-top: 1px solid #ddd; font-size: 14px;">
                    <p>📍 ${v.origem} ➔ ${v.destino}</p>
                    <p>📉 Despesas Totais: R$ ${v.valores.total_despesas.toFixed(2)}</p>
                </div>
            </details>`;
        });
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = "<p style='color: red;'>Erro ao carregar histórico.</p>";
    }
}
