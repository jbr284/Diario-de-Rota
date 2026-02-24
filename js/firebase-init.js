// Importando via CDN para rodar direto no navegador sem precisar de Node.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Configuração do seu app: Diário de Rota
const firebaseConfig = {
  apiKey: "AIzaSyA2qovdLIlHnvvuq9Xb_CZDUFEehcWZABc",
  authDomain: "diario-de-rota-aad76.firebaseapp.com",
  projectId: "diario-de-rota-aad76",
  storageBucket: "diario-de-rota-aad76.firebasestorage.app",
  messagingSenderId: "591673158019",
  appId: "1:591673158019:web:0b819b10c2a836e2b16eb6"
};

// Inicializando o aplicativo Firebase
const app = initializeApp(firebaseConfig);

// Exportando os serviços para usarmos nos outros arquivos JS
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("🔥 Diário de Rota conectado ao Firebase com sucesso!");
