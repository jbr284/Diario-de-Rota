import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-init.js";

// --- 1. VERIFICADOR DE AUTO-LOGIN ---
// Se o usuário entrar no site e já estiver logado (sessão salva), manda direto pro dashboard.
onAuthStateChanged(auth, (user) => {
    const urlAtual = window.location.href;
    if (user && (urlAtual.includes("index.html") || urlAtual.endsWith("Diario-de-Rota/"))) {
        window.location.replace("./dashboard.html");
    }
});

// --- 2. LÓGICA DO FORMULÁRIO DE LOGIN ---
const loginForm = document.getElementById("login-form");

if (loginForm) {
    loginForm.addEventListener("submit", async (evento) => {
        evento.preventDefault(); 
        
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;
        const btnLogin = document.getElementById("btn-login");

        try {
            btnLogin.innerText = "Verificando...";
            btnLogin.disabled = true;

            const credenciais = await signInWithEmailAndPassword(auth, email, senha);
            console.log("Usuário logado:", credenciais.user.email);
            
            // Login deu certo? Direto pro painel usando rota relativa!
            window.location.href = "./dashboard.html";
            
        } catch (erro) {
            console.error("Erro no login:", erro.code);
            
            if (erro.code === 'auth/invalid-credential') {
                alert("E-mail ou senha incorretos. Tente novamente.");
            } else {
                alert("Erro ao tentar entrar: " + erro.message);
            }
            
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.disabled = false;
        }
    });
}
