import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-init.js";

// 1. Protetor de Rota (Route Guard)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado. Pode continuar na página.
        console.log("Motorista autenticado:", user.email);
        // Aqui no futuro vamos buscar o nome dele no banco para trocar o "Olá, Motorista!"
    } else {
        // Usuário NÃO está logado. Chuta ele de volta pro login.
        console.warn("Acesso negado. Redirecionando para login...");
        window.location.replace("index.html");
    }
});

// 2. Lógica de Logout (Sair)
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
        try {
            await signOut(auth);
            // O onAuthStateChanged vai detectar a saída e redirecionar automaticamente
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    });
}
