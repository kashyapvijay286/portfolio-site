// ==========================================
// 2. CENTRAL AUTHENTICATION ENGINE (STRICT WATCHDOG)
// ==========================================
let currentUser = null;
const MASTER_ADMIN_USER = "Admin909"; 

(function() {
    const sessionUser = localStorage.getItem("theeha_user");
    
    if (sessionUser && sessionUser.trim() !== "") {
        currentUser = sessionUser.trim();
        document.documentElement.classList.remove('logged-out');
        document.documentElement.classList.add('logged-in');
    } else {
        currentUser = null;
        document.documentElement.classList.remove('logged-in');
        document.documentElement.classList.add('logged-out');
    }
})();

// 🔒 MASTER SECURITY SYNC & ADMIN PANEL GATEKEEPER
window.addEventListener("load", () => {
    const isCurrentGuest = currentUser && currentUser.toLowerCase() === "guest";

    // 1. Guest Page Restrictions Watchdog (फिक्स: बुलेटप्रूफ पाथ डिटेक्शन)
    if (typeof db !== "undefined" && isCurrentGuest) {
        db.collection("system_flags").doc("config").onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                const currentPath = window.location.pathname.toLowerCase();
                
                let isPageLocked = false;
                if (currentPath.includes("kalamkaari") && data.lock_kalamkaari_guest === true) isPageLocked = true;
                if (currentPath.includes("siebel") && data.lock_siebel_guest === true) isPageLocked = true;
                if (currentPath.includes("kashmakash") && data.lock_kashmakash_guest === true) isPageLocked = true;

                if (isPageLocked) {
                    alert("🔒 यह पेज गेस्ट के लिए लॉक है! कृपया रजिस्टर या लॉगिन करें।");
                    localStorage.removeItem("theeha_user");
                    window.location.reload();
                }
            }
        });
    }

    // 2. Direct Admin Dashboard Connector Engine
    if (typeof window.syncSecurityDashboardView === "function") {
        window.syncSecurityDashboardView();
    }
});