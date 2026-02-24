import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-init.js";

// --- 1. SEGURANÇA DE ROTA (Com proteção Anti-Loop) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado: exibe o nome dele na tela
        const greeting = document.getElementById("user-greeting");
        if (greeting) {
            greeting.innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
        }
    } else {
        // Usuário DESLOGADO: Verifica em qual página estamos antes de redirecionar
        const urlAtual = window.location.href;
        // Só redireciona se a pessoa estiver na página do dashboard
        if (urlAtual.includes("dashboard.html")) {
            window.location.replace("./index.html");
        }
    }
});

// --- 2. LOGOUT (Sair) ---
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
        try {
            btnLogout.innerText = "Saindo...";
            await signOut(auth); // Isso avisa o Firebase para encerrar a sessão
            // Após isso, o onAuthStateChanged ali em cima toma o controle e faz o redirecionamento.
        } catch (error) {
            console.error("Erro ao sair:", error);
            btnLogout.innerText = "Sair";
        }
    });
}

// --- 3. CONTROLE DO MODAL (FORMULÁRIO) ---
const modal = document.getElementById("trip-modal");
const btnCloseModal = document.getElementById("close-modal");
const spanPlaca = document.getElementById("placa-selecionada");
let placaAtual = "";

document.querySelectorAll(".truck-card").forEach(button => {
    button.addEventListener("click", (e) => {
        placaAtual = e.currentTarget.getAttribute("data-placa");
        spanPlaca.innerText = placaAtual;
        modal.classList.add("active");
    });
});

if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
        modal.classList.remove("active");
    });
}

// --- 4. CÁLCULOS AUTOMÁTICOS EM TEMPO REAL ---
const inputsKm = document.querySelectorAll(".calc-km");
inputsKm.forEach(input => {
    input.addEventListener("input", () => {
        const inicio = parseFloat(document.getElementById("km_inicio").value) || 0;
        const final = parseFloat(document.getElementById("km_final").value) || 0;
        const total = final > inicio ? final - inicio : 0;
        document.getElementById("km_total_display").innerText = total;
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

        document.getElementById("total_despesas_display").innerText = totalDespesas.toFixed(2);
        document.getElementById("total_liquido_display").innerText = liquido.toFixed(2);
    });
});

// --- 5. PREPARANDO O SALVAMENTO ---
const tripForm = document.getElementById("trip-form");
if (tripForm) {
    tripForm.addEventListener("submit", (e) => {
        e.preventDefault();
        alert(`Pronto para salvar a viagem do caminhão ${placaAtual} no Firebase!`);
    });
}
