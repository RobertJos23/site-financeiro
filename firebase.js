import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"

const firebaseConfig = {
    apiKey: "AIzaSyAdx0TM3uuUyLj_1IBXHfJd0_bdQKE5ONw",
    authDomain: "site-financeiro-399b7.firebaseapp.com",
    projectId: "site-financeiro-399b7",
    storageBucket: "site-financeiro-399b7.firebasestorage.app",
    messagingSenderId: "236194735801",
    appId: "1:236194735801:web:62c0b2adacfd8b69129d68"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
