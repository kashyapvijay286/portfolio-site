// ==========================================
// 3. AUTHENTICATION & GLOBAL FLAGS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // 📱 Helper Functions for Device Logging (Scope ke andar safe)
    function getDeviceOS() {
        const ua = navigator.userAgent;
        if (/android/i.test(ua)) return "Android Mobile";
        if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "iOS (iPhone)";
        if (/Win/i.test(ua)) return "Windows PC";
        if (/Mac/i.test(ua)) return "Mac PC";
        return "Unknown OS";
    }

    async function getMobileModel() {
        if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === "function") {
            try {
                const hints = await navigator.userAgentData.getHighEntropyValues(['model']);
                if (hints.model) return hints.model;
            } catch (e) {}
        }
        const ua = navigator.userAgent;
        if (/android/i.test(ua)) {
            const match = ua.match(/Android\s+\d+;\s+([^;)]+)/);
            return match && match[1] ? match[1].trim() : "Android Device";
        }
        if (/iPhone|iPad|iPod/.test(ua)) return "iPhone";
        return "N/A";
    }
    
    db.collection("system_flags").doc("config").onSnapshot((doc) => {
        if (doc.exists) {
            flags = doc.data();
            const canvasBlock = document.getElementById("admin-flag-canvas");
            const searchBlock = document.getElementById("admin-flag-search");
            if (canvasBlock) canvasBlock.style.display = flags.canvas ? "flex" : "none";
            if (searchBlock) searchBlock.style.display = flags.search ? "block" : "none";

            if (document.getElementById("admin-panel-dashboard")) {
                const liveK = document.getElementById("live-kalamkaari");
                if (liveK) {
                    liveK.checked = flags.live_kalamkaari;
                    document.getElementById("live-siebel").checked = flags.live_siebel;
                    document.getElementById("live-kashmakash").checked = flags.live_kashmakash;
                    document.getElementById("guest-post-flag").checked = flags.guest_post;
                    document.getElementById("guest-comment-flag").checked = flags.guest_comment;
                    document.getElementById("flag-comments").checked = flags.comments;
                    document.getElementById("flag-sharing").checked = flags.sharing;
                    document.getElementById("flag-canvas").checked = flags.canvas;
                    document.getElementById("flag-search").checked = flags.search;
                }
            }
        }
    });

    window.renderAuthWidgetState = function() {
        const container = document.getElementById("auth-container-gate");
        if (!container) return;

        if (currentUser && currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
            const navbarDrawer = document.getElementById("navbar-links-drawer");
            if (navbarDrawer && !document.getElementById("admin-nav-item-link")) {
                const li = document.createElement("li"); li.id = "admin-nav-item-link";
                li.innerHTML = `<a href="admin.html" style="color:var(--accent-color); font-weight:700;">⭐ Admin Panel</a>`;
                navbarDrawer.appendChild(li);
            }
        }

        if (currentUser) {
            container.innerHTML = `
                <div class="user-badge">
                    👤 <span style="margin-left:0.25rem; font-weight:bold; color:var(--text-main);">${currentUser}</span> 
                    ${currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() ? '<span style="font-size:0.6rem; background:#ef4444; color:#fff; padding:1px 4px; border-radius:4px; margin-left:0.3rem;">OVERLORD</span>' : ''}
                </div>
            `;
            const authorInput = document.getElementById("input-author") || document.getElementById("blog-author") || document.getElementById("kash-author");
            if (authorInput) { 
                if (currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
                    authorInput.value = "admin"; authorInput.disabled = false; authorInput.style.opacity = "1";
                } else {
                    authorInput.value = currentUser; authorInput.disabled = true; authorInput.style.opacity = "0.6";
                }
            }
        } else {
            container.innerHTML = `
                <div class="login-widget">
                    <input type="text" id="auth-user" placeholder="Username">
                    <input type="password" id="auth-pin" placeholder="PIN" maxlength="4">
                    <button class="btn" id="auth-login-btn" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;">Join/Go</button>
                </div>
            `;
            setTimeout(() => {
                const loginBtn = document.getElementById("auth-login-btn");
                if (loginBtn) loginBtn.onclick = handleIdentityGateSubmit;
            }, 100);
        }
        if (typeof syncSecurityDashboardView === "function") syncSecurityDashboardView();
    };

    // 🔥 Dynamic Validation aur Device Logging logic lagane ke liye isko 'async' banaya hai
    async function handleIdentityGateSubmit() {
        const u = document.getElementById("auth-user").value.trim();
        const p = document.getElementById("auth-pin").value.trim();
        if (!u || p.length !== 4 || isNaN(p)) return alert("Enter valid Username and 4-Digit numeric PIN!");

        // 🔒 SECURITY CHECK: Fake identity creation ko block karna
        const blockedNames = ["admin", "administrator", "moderator", "theeha", "system", "owner"];
        if (blockedNames.includes(u.toLowerCase())) {
            return alert("❌ Yeh username allowed nahi hai! Kripya koi doosra naam chunein.");
        }

        if (u.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() && p === MASTER_ADMIN_PIN) {
            localStorage.setItem("theeha-user", MASTER_ADMIN_USER); 
            alert("Authorized Master Admin Overlord."); 
            if (!window.location.pathname.includes("admin.html")) window.location.replace("admin.html");
            else window.location.reload();
            return;
        }

        const userRef = db.collection("users_registry").doc(u.toLowerCase());
        userRef.get().then(async (doc) => {
            if (doc.exists) {
                if (doc.data().pin === p) { 
                    localStorage.setItem("theeha-user", doc.data().username); window.location.reload(); 
                } else { 
                    alert("Incorrect PIN for this username!"); 
                }
            } else {
                // 📱 Naye users ki device parameters ko runtime par detect karna
                const detectedOS = getDeviceOS();
                const detectedModel = await getMobileModel();

                userRef.set({ 
                    username: u, 
                    pin: p, 
                    deviceOS: detectedOS,       // Save hardware context
                    deviceModel: detectedModel,   // Save device identifier
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                }).then(() => {
                    localStorage.setItem("theeha-user", u);
                    alert(`New Identity [${u}] registered successfully! 🎉`); window.location.reload();
                });
            }
        }).catch(err => alert("Registry Error: " + err.message));
    }

    renderAuthWidgetState();
});