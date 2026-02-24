import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-init.js";

// --- 1. SEGURANÇA DE ROTA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("user-greeting").innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
    } else {
        window.location.replace("index.html");
    }
});

// Logout
document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await signOut(auth);
});

// --- 2. CONTROLE DO MODAL (FORMULÁRIO) ---
const modal = document.getElementById("trip-modal");
const btnCloseModal = document.getElementById("close-modal");
const spanPlaca = document.getElementById("placa-selecionada");
let placaAtual = "";

// Abrir modal ao clicar em um caminhão
document.querySelectorAll(".truck-card").forEach(button => {
    button.addEventListener("click", (e) => {
        // Pega a placa do botão clicado
        placaAtual = e.currentTarget.getAttribute("data-placa");
        spanPlaca.innerText = placaAtual;
        modal.classList.add("active");
    });
});

// Fechar modal
btnCloseModal.addEventListener("click", () => {
    modal.classList.remove("active");
});

// --- 3. CÁLCULOS AUTOMÁTICOS EM TEMPO REAL ---
// Lógica da Quilometragem
const inputsKm = document.querySelectorAll(".calc-km");
inputsKm.forEach(input => {
    input.addEventListener("input", () => {
        const inicio = parseFloat(document.getElementById("km_inicio").value) || 0;
        const final = parseFloat(document.getElementById("km_final").value) || 0;
        const total = final > inicio ? final - inicio : 0;
        document.getElementById("km_total_display").innerText = total;
    });
});

// Lógica Financeira (Frete, Despesas e Líquido)
const inputsFinanceiros = document.querySelectorAll(".calc-input");
inputsFinanceiros.forEach(input => {
    input.addEventListener("input", () => {
        const frete = parseFloat(document.getElementById("valor_frete").value) || 0;
        const mot = parseFloat(document.getElementById("desp_mot").value) || 0;
        const comb = parseFloat(document.getElementById("desp_comb").value) || 0;
        const pedagio = parseFloat(document.getElementById("desp_pedagio").value) || 0;

        const totalDespesas = mot + comb + pedagio;
        const liquido = frete - totalDespesas;

        // Atualiza a tela formatando para Moeda (R$)
        document.getElementById("total_despesas_display").innerText = totalDespesas.toFixed(2);
        document.getElementById("total_liquido_display").innerText = liquido.toFixed(2);
    });
});

// --- 4. PREPARANDO O SALVAMENTO ---
document.getElementById("trip-form").addEventListener("submit", (e) => {
    e.preventDefault();
    alert(`Pronto para salvar a viagem do caminhão ${placaAtual} no Firebase!`);
    // No próximo passo, enviaremos o objeto JSON para o banco de dados aqui.
});
