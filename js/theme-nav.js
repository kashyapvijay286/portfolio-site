// ==========================================
// 2. THEME & NAVIGATION ENGINE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Theme Engine
    const savedTheme = localStorage.getItem("theeha-theme");
    let activeTheme = savedTheme ? savedTheme : "light";
    if (!savedTheme) localStorage.setItem("theeha-theme", "light");
    document.documentElement.setAttribute("data-theme", activeTheme);

    const themeToggleBtn = document.querySelectorAll("#theme-toggle");
    if (themeToggleBtn.length) themeToggleBtn.forEach(b => b.textContent = activeTheme === "dark" ? "🌙" : "☀️");

    themeToggleBtn.forEach(btn => {
        btn.onclick = function() {
            const targetMode = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", targetMode);
            localStorage.setItem("theeha-theme", targetMode);
            themeToggleBtn.forEach(b => b.textContent = targetMode === "dark" ? "🌙" : "☀️");
        };
    });

    // Mobile Hamburger Menu
    const hamburgerTrigger = document.getElementById("hamburger-menu-trigger");
    const navbarDrawer = document.getElementById("navbar-links-drawer");
    if (hamburgerTrigger && navbarDrawer) {
        hamburgerTrigger.onclick = function(e) { e.stopPropagation(); navbarDrawer.classList.toggle("mobile-open"); };
        document.addEventListener("click", () => { navbarDrawer.classList.remove("mobile-open"); });
    }

    // 👤 BUILT-IN USER BADGE & SEPARATE ADMIN BUTTON INJECTOR
    const sessionUser = localStorage.getItem("theeha_user");
    if (sessionUser && sessionUser.trim() !== "") {
        const currentUser = sessionUser.trim();
        const MASTER_ADMIN_USER = "Admin909"; 
        
        const isAdmin = (currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase());
        const isGuest = (currentUser.toLowerCase() === "guest");

        // 1. 🎯 एडमिन के लिए प्रॉपर बड़ा बटन
        let adminPortalLink = isAdmin
            ? `<button onclick="window.location.href='admin.html'" style="background:#ef4444; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-weight:bold; margin-right:10px; box-shadow: 0 2px 5px rgba(239,68,68,0.4);">⚙️ Admin Panel</button>`
            : '';

        let displayBadgeName = isGuest ? "🚶‍♂️ Guest Reader" : `👤 ${currentUser}`;
        
        // 2. 🎯 फिक्स: एग्जिट बटन सिर्फ और सिर्फ गेस्ट यूज़र के लिए, एडमिन या नॉर्मल यूज़र के लिए नहीं
        let exitButtonHTML = isGuest
            ? `<button class="btn btn-danger" id="nav-engine-logout-btn" style="padding:0.15rem 0.4rem; font-size:0.7rem; border-radius:4px; cursor:pointer; margin-left: 10px; background:#ef4444; border:none; color:#fff; font-weight:bold;">Exit</button>`
            : '';

        // 3. 🎯 फाइनल डिब्बा (जिसमें सब कुछ एक साथ है)
        const badgeHTML = `
            <div class="user-badge" style="display:inline-flex; align-items:center; background: rgba(255, 255, 255, 0.08); padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border-color); white-space: nowrap;">
                ${adminPortalLink}
                <span style="font-weight:700; color:var(--text-main); font-size:0.9rem;">${displayBadgeName}</span>
                ${exitButtonHTML}
            </div>
        `;

        const gateContainer = document.getElementById("auth-container-gate");
        if (gateContainer) {
            gateContainer.innerHTML = badgeHTML;
            gateContainer.style.cssText = "display: inline-block !important; visibility: visible !important; opacity: 1 !important; margin-right: 15px;";
        }

        // 4. 🎯 मोबाइल मेनू (Navigation List) में एडमिन का लिंक जोड़ें
        if (isAdmin && navbarDrawer) {
            if (!document.getElementById("nav-admin-link-node")) {
                const adminMenuLi = document.createElement("li");
                adminMenuLi.id = "nav-admin-link-node";
                adminMenuLi.innerHTML = `<a href="admin.html" style="color: #ef4444; font-weight: 800;">⚙️ Control Room</a>`;
                navbarDrawer.appendChild(adminMenuLi);
            }
        }

        // Logout Event Listener (सिर्फ गेस्ट के लिए काम करेगा क्योंकि बटन उसी के पास है)
        setTimeout(() => {
            const logoutBtn = document.getElementById("nav-engine-logout-btn");
            if(logoutBtn) {
                logoutBtn.onclick = function(e) {
                    e.preventDefault();
                    localStorage.removeItem("theeha_user");
                    window.location.reload();
                };
            }
        }, 100);
    }
});