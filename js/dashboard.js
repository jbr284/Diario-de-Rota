import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

// --- 1. SEGURANÇA DE TELA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const greeting = document.getElementById("user-greeting");
        if (greeting) greeting.innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
    } else {
        // Se NÃO tem usuário, chuta de volta para o login
        window.location.replace("./index.html");
    }
});

// --- 2. LOGOUT SEGURO (Sair) ---
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
        e.preventDefault(); 
        try {
            btnLogout.innerText = "Saindo...";
            await signOut(auth); // Corta a sessão no Firebase
            // O redirecionamento acontece automaticamente pelo onAuthStateChanged acima
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

// --- 4. CÁLCULOS MATEMÁTICOS AUTOMÁTICOS ---
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

// --- 5. SALVAMENTO NO BANCO DE DADOS (FIRESTORE) ---
const tripForm = document.getElementById("trip-form");
const btnSaveTrip = document.getElementById("btn-save-trip");

if (tripForm) {
    tripForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) return;

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
                valores: { 
                    frete_bruto: frete, 
                    despesa_motorista: mot, 
                    despesa_combustivel: comb, 
                    despesa_pedagio: pedagio, 
                    total_despesas: totalDespesas, 
                    total_liquido: liquido 
                },
                quilometragem: { 
                    km_inicio: inicio, 
                    km_final: final, 
                    km_total: totalKm 
                },
                criado_em: serverTimestamp()
            };

            // Envia para o banco de dados
            await addDoc(collection(db, "viagens"), novaViagem);
            
            alert("✅ Viagem salva com sucesso!");
            
            // Limpa o formulário e fecha
            tripForm.reset();
            document.getElementById("total_despesas_display").innerText = "0.00";
            document.getElementById("total_liquido_display").innerText = "0.00";
            document.getElementById("km_total_display").innerText = "0";
            if (modal) modal.classList.remove("active");

        } catch (error) {
            console.error("Erro ao salvar a viagem: ", error);
            alert("Falha ao salvar. Verifique sua conexão com a internet.");
        } finally {
            if (btnSaveTrip) {
                btnSaveTrip.innerText = "💾 Salvar Viagem";
                btnSaveTrip.disabled = false;
            }
        }
    });
}
