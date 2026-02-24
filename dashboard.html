import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

// --- 1. SEGURANÇA DE TELA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const greeting = document.getElementById("user-greeting");
        if (greeting) greeting.innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
        
        // O usuário logou? Então disparamos a busca para apagar o "Carregando..."
        carregarHistoricoViagens(user.uid);
    } else {
        window.location.replace("./index.html");
    }
});

// --- 2. LOGOUT SEGURO ---
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
        e.preventDefault(); 
        try {
            btnLogout.innerText = "Saindo...";
            await signOut(auth); 
        } catch (error) {
            console.error("Erro ao sair:", error);
            btnLogout.innerText = "Sair";
        }
    });
}

// --- 3. CONTROLE DO MODAL ---
const modal = document.getElementById("trip-modal");
const btnCloseModal = document.getElementById("close-modal");
const spanPlaca = document.getElementById("placa-selecionada");
let placaAtual = "";

document.querySelectorAll(".truck-card").forEach(button => {
    button.addEventListener("click", (e) => {
        placaAtual = e.currentTarget.getAttribute("data-placa");
        if (spanPlaca) spanPlaca.innerText = placaAtual;
        if (modal) modal.classList.add("active");
    });
});

if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
        modal.classList.remove("active");
    });
}

// --- 4. CÁLCULOS AUTOMÁTICOS ---
const inputsKm = document.querySelectorAll(".calc-km");
inputsKm.forEach(input => {
    input.addEventListener("input", () => {
        const inicio = parseFloat(document.getElementById("km_inicio").value) || 0;
        const final = parseFloat(document.getElementById("km_final").value) || 0;
        const total = final > inicio ? final - inicio : 0;
        const display = document.getElementById("km_total_display");
        if (display) display.innerText = total;
    });
});

const inputsFinanceiros = document.querySelectorAll(".calc-input");
inputsFinanceiros.forEach(input => {
    input.addEventListener("input", () => {
        const frete = parseFloat(document.getElementById("valor_frete").value) || 0;
        const mot = parseFloat(document.getElementById("desp_mot").value) || 0;
        const comb = parseFloat(document.getElementById("desp_comb").value) || 0;
        const pedagio = parseFloat(document.getElementById("desp_pedagio").value) || 0;

        const totalDespesas = mot + comb + pedagio;
        const liquido = frete - totalDespesas;

        const despDisplay = document.getElementById("total_despesas_display");
        const liqDisplay = document.getElementById("total_liquido_display");
        if (despDisplay) despDisplay.innerText = totalDespesas.toFixed(2);
        if (liqDisplay) liqDisplay.innerText = liquido.toFixed(2);
    });
});

// --- 5. BUSCAR HISTÓRICO NO BANCO (A Sanfona) ---
async function carregarHistoricoViagens(uid) {
    const container = document.getElementById("accordion-container");
    try {
        // Pede ao Firebase apenas as viagens deste motorista logado
        const q = query(collection(db, "viagens"), where("motorista_uid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = "<p class='loading-text'>Nenhuma viagem registrada ainda.</p>";
            return;
        }

        // Coloca os resultados num Array e ordena pela data mais recente
        let viagens = [];
        querySnapshot.forEach((doc) => viagens.push(doc.data()));
        viagens.sort((a, b) => new Date(b.data_viagem) - new Date(a.data_viagem));

        let html = "";
        viagens.forEach((viagem) => {
            // A tag <details> cria o menu recolher/expandir nativamente!
            html += `
            <details class="form-section" style="margin-bottom: 10px; cursor: pointer; background: #fff;">
                <summary style="font-weight: bold; padding: 10px; outline: none;">
                    📅 ${viagem.data_viagem} | 🚚 ${viagem.veiculo_id} <br>
                    <span style="color: #2ecc71;">💰 LÍQUIDO: R$ ${viagem.valores.total_liquido.toFixed(2)}</span>
                </summary>
                <div style="padding: 10px; border-top: 1px solid #ddd; font-size: 14px; color: #444;">
                    <p>📍 <strong>Rota:</strong> ${viagem.origem} ➔ ${viagem.destino}</p>
                    <p>📦 <strong>NF:</strong> ${viagem.numero_nf || 'S/N'}</p>
                    <p>📉 <strong>Despesas Totais:</strong> R$ ${viagem.valores.total_despesas.toFixed(2)}</p>
                    <p>🛣️ <strong>Km Rodado:</strong> ${viagem.quilometragem.km_total} km</p>
                </div>
            </details>`;
        });
        
        container.innerHTML = html; // Substitui o texto "Carregando..." pelo histórico real

    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        container.innerHTML = "<p class='loading-text' style='color: red;'>Erro ao carregar viagens.</p>";
    }
}

// --- 6. SALVAR NO BANCO DE DADOS ---
const tripForm = document.getElementById("trip-form");
const btnSaveTrip = document.getElementById("btn-save-trip");

if (tripForm) {
    tripForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) {
            alert("Erro: Sessão não identificada. Atualize a página e tente novamente.");
            return;
        }

        try {
            if (btnSaveTrip) {
                btnSaveTrip.innerText = "Salvando na Nuvem...";
                btnSaveTrip.disabled = true;
            }

            const frete = parseFloat(document.getElementById("valor_frete").value) || 0;
            const mot = parseFloat(document.getElementById("desp_mot").value) || 0;
            const comb = parseFloat(document.getElementById("desp_comb").value) || 0;
            const pedagio = parseFloat(document.getElementById("desp_pedagio").value) || 0;
            const totalDespesas = mot + comb + pedagio;
            const liquido = frete - totalDespesas;

            const inicio = parseFloat(document.getElementById("km_inicio").value) || 0;
            const final = parseFloat(document.getElementById("km_final").value) || 0;
            const totalKm = final > inicio ? final - inicio : 0;

            const novaViagem = {
                veiculo_id: placaAtual,
                motorista_email: auth.currentUser.email,
                motorista_uid: auth.currentUser.uid,
                data_viagem: document.getElementById("data_viagem").value,
                origem: document.getElementById("origem").value,
                destino: document.getElementById("destino").value,
                numero_nf: document.getElementById("nf").value,
                valores: { frete_bruto: frete, despesa_motorista: mot, despesa_combustivel: comb, despesa_pedagio: pedagio, total_despesas: totalDespesas, total_liquido: liquido },
                quilometragem: { km_inicio: inicio, km_final: final, km_total: totalKm },
                criado_em: serverTimestamp()
            };

            console.log("Tentando enviar documento para o Firebase...");
            await addDoc(collection(db, "viagens"), novaViagem);
            
            alert("✅ Viagem salva com sucesso!");
            
            // Limpa o formulário e fecha o modal
            tripForm.reset();
            document.getElementById("total_despesas_display").innerText = "0.00";
            document.getElementById("total_liquido_display").innerText = "0.00";
            document.getElementById("km_total_display").innerText = "0";
            if (modal) modal.classList.remove("active");

            // Atualiza a lista na tela automaticamente!
            carregarHistoricoViagens(auth.currentUser.uid);

        } catch (error) {
            console.error("ERRO COMPLETO AO SALVAR: ", error);
            // Agora o erro grita na tela para podermos debugar!
            alert(`Erro ao salvar! Detalhe do sistema: ${error.message}`);
        } finally {
            if (btnSaveTrip) {
                btnSaveTrip.innerText = "💾 Salvar Viagem";
                btnSaveTrip.disabled = false;
            }
        }
    });
}
