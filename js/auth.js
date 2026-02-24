// Importamos a função de login do Firebase
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Importamos a nossa variável 'auth' que já configuramos no outro arquivo
import { auth } from "./firebase-init.js";

// Pegamos o formulário de login do HTML
const loginForm = document.getElementById("login-form");

// Se o formulário existir na tela, começamos a monitorar ele
if (loginForm) {
    loginForm.addEventListener("submit", async (evento) => {
        // Previne que a página recarregue ao clicar no botão (comportamento padrão do HTML)
        evento.preventDefault(); 
        
        // Pegamos os valores digitados nos campos
        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;
        const btnLogin = document.getElementById("btn-login");

        try {
            // Muda o texto do botão para dar feedback visual ao motorista e evita duplo clique
            btnLogin.innerText = "Aguarde...";
            btnLogin.disabled = true;

            // Tenta logar no Firebase com o e-mail e senha informados
            const credenciais = await signInWithEmailAndPassword(auth, email, senha);
            console.log("Usuário logado com sucesso:", credenciais.user.email);
            
            // LOGADO! Redireciona imediatamente para o painel principal (Dashboard)
            window.location.href = "dashboard.html";
            
        } catch (erro) {
            console.error("Erro no login:", erro.code);
            
            // Tratamento de erros comuns para avisar o usuário
            if (erro.code === 'auth/invalid-credential') {
                alert("E-mail ou senha incorretos. Tente novamente.");
            } else if (erro.code === 'auth/too-many-requests') {
                alert("Muitas tentativas falhas. Conta temporariamente bloqueada.");
            } else {
                alert("Erro ao tentar entrar: " + erro.message);
            }
            
            // Restaura o botão apenas se der erro (se der sucesso, a página já terá mudado)
            btnLogin.innerText = "Entrar no Sistema";
            btnLogin.disabled = false;
        }
    });
}
