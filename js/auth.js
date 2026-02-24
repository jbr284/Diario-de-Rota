import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-init.js";

// 1. CÓDIGO DE EMERGÊNCIA (Anti-Loop): Destrói caches antigos presos no navegador
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    });
}

const loginForm = document.getElementById("login-form");
const btnLogin = document.getElementById("btn-login");

// 2. O FREIO DE MÃO (Fim do redirecionamento automático)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Se já está logado, muda o botão em vez de forçar a tela a piscar
        if (btnLogin) {
            btnLogin.innerText = "Já está logado! Ir para o Painel ➔";
            btnLogin.style.backgroundColor = "#2ecc71"; // Botão fica verde
        }
    } else {
        // Se deslogou, garante que o botão fica normal
        if (btnLogin) {
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.style.backgroundColor = "#2980b9"; // Azul padrão
        }
    }
});

if (loginForm) {
    loginForm.addEventListener("submit", async (evento) => {
        evento.preventDefault(); 
        
        // Se o usuário clicar no botão e já estiver logado (Botão Verde)
        if (auth.currentUser) {
            window.location.href = "./dashboard.html";
            return;
        }
        
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;

        try {
            btnLogin.innerText = "Aguarde...";
            btnLogin.disabled = true;

            await signInWithEmailAndPassword(auth, email, senha);
            
            // Só redireciona depois que o login novo for validado com sucesso
            window.location.href = "./dashboard.html";
            
        } catch (erro) {
            console.error("Erro no login:", erro.code);
            alert("E-mail ou senha incorretos. Tente novamente.");
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.disabled = false;
        }
    });
}
