import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-init.js";

// Se o utilizador já tem sessão iniciada, vai logo para o painel
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    }
});

const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (evento) => {
        evento.preventDefault(); 
        
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;
        const btnLogin = document.getElementById("btn-login");

        try {
            btnLogin.innerText = "Aguarde...";
            btnLogin.disabled = true;

            await signInWithEmailAndPassword(auth, email, senha);
            // Redirecionamento após sucesso
            window.location.href = "dashboard.html";
            
        } catch (erro) {
            console.error("Erro no login:", erro.code);
            alert("E-mail ou senha incorretos. Tente novamente.");
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.disabled = false;
        }
    });
}
