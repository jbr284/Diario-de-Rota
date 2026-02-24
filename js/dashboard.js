import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

// --- 1. SEGURANÇA BLINDADA ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const greeting = document.getElementById("user-greeting");
        if (greeting) greeting.innerText = `Olá, ${user.email.split('@')[0]}! 🚚`;
    } else {
        // Sem utilizador: Volta para o login imediatamente
        window.location.replace("index.html");
    }
});

// Logout (Sair)
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
        btnLogout.innerText = "Saindo...";
        await signOut(auth); 
        // A função onAuthStateChanged vai detetar o logoff e mudar de página sozinha
    });
}

// --- 2. CONTROLE DO MODAL ---
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

// --- 3. CÁLCULOS MATEMÁTICOS ---
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

// --- 4. SALVAMENTO NO FIRESTORE ---
const tripForm = document.getElementById("trip-form");
const btnSaveTrip = document.getElementById("btn-save-trip");

if (tripForm) {
    tripForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!auth.currentUser) return;

        try {
            btnSaveTrip.innerText = "Salvando...";
            btnSaveTrip.disabled = true;

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

            await addDoc(collection(db, "viagens"), novaViagem);
            
            alert("Viagem guardada com sucesso!");
            tripForm.reset();
            document.getElementById("total_despesas_display").innerText = "0.00";
            document.getElementById("total_liquido_display").innerText = "0.00";
            document.getElementById("km_total_display").innerText = "0";
            modal.classList.remove("active");

        } catch (error) {
            console.error("Erro a guardar a viagem: ", error);
            alert("Falha ao guardar. Verifique a consola.");
        } finally {
            btnSaveTrip.innerText = "💾 Guardar Viagem";
            btnSaveTrip.disabled = false;
        }
    });
}
