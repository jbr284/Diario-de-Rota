import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-init.js";

// Redireciona imediatamente se já houver um utilizador com sessão iniciada
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("./dashboard.html");
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
            window.location.replace("./dashboard.html");
            
        } catch (erro) {
            console.error("Erro no login:", erro.code);
            alert("E-mail ou palavra-passe incorretos. Tente novamente.");
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.disabled = false;
        }
    });
}
