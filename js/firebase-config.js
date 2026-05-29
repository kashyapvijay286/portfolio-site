const firebaseConfig = {
    apiKey: "AIzaSyC62G11uTXCOHSULYWnG3lF8TWRtBBqO6A",
    authDomain: "theeha-fdd1f.firebaseapp.com",
    projectId: "theeha-fdd1f",
    storageBucket: "theeha-fdd1f.firebasestorage.app",
    messagingSenderId: "386632767113",
    appId: "1:386632767113:web:ca406cf5b4e00e82c25858"
};


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Constants & State
const MASTER_ADMIN_USER = "admin909";
const MASTER_ADMIN_PIN = "9090";
let currentUser = localStorage.getItem("theeha-user") || null;
let flags = { comments: true, sharing: true, canvas: true, search: true, live_kalamkaari: true, live_siebel: true, live_kashmakash: true, guest_post: true, guest_comment: true };
const sessionTrackedViews = new Set();