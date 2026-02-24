// Importamos a função de login do Firebase
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Importamos a nossa variável 'auth' que já configuramos no outro arquivo
import { auth } from "./firebase-init.js";

// Pegamos o formulário do HTML
const loginForm = document.getElementById("login-form");

// Se o formulário existir na tela, começamos a monitorar ele
if (loginForm) {
    loginForm.addEventListener("submit", async (evento) => {
        // Previne que a página recarregue ao clicar no botão
        evento.preventDefault(); 
        
        // Pegamos os valores digitados
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;
        const btnLogin = document.getElementById("btn-login");

        try {
            // Muda o texto do botão para dar feedback visual ao motorista
            btnLogin.innerText = "Aguarde...";
            btnLogin.disabled = true;

            // Tenta logar no Firebase
            const credenciais = await signInWithEmailAndPassword(auth, email, senha);
            console.log("Usuário logado:", credenciais.user.email);
            
            alert("Login realizado com sucesso! Bem-vindo.");
            // No próximo passo, em vez de um 'alert', nós faremos o redirecionamento 
            // para a tela principal (Dashboard / Histórico).
            
        } catch (erro) {
            console.error("Erro no login:", erro.code);
            // Tratamento de erros comuns
            if (erro.code === 'auth/invalid-credential') {
                alert("E-mail ou senha incorretos.");
            } else {
                alert("Erro ao tentar entrar: " + erro.message);
            }
        } finally {
            // Restaura o botão caso dê erro
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.disabled = false;
        }
    });
}
