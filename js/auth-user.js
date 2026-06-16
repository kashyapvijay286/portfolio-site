// ==========================================
// 3. AUTHENTICATION & GLOBAL FLAGS (OVERLAY METHOD)
// ==========================================

// ✅ Har page reload par sabse pehle localStorage se data uthao
window.currentUser = localStorage.getItem("theeha-user");
// ✅ Har page reload par sabse pehle localStorage se data uthao
window.currentUser = localStorage.getItem("theeha-user");

// ✅ ONESIGNAL KO BATAO KI YEH DEVICE KISKA HAI
if (window.currentUser) {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.login(window.currentUser.toLowerCase());
    });
}
document.addEventListener("DOMContentLoaded", () => {
    
    // 📱 Helper Functions for Device Logging
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
        
        // 🛑 AGAR USER LOGGED IN NAHI HAI -> Show Full Screen Overlay
        if (!window.currentUser) {
            // Background content ko hide karo
            const mainContent = document.querySelector("main");
            if(mainContent) mainContent.style.display = "none";
            
            // Unbreakable Login Wall
            const overlay = document.createElement("div");
            overlay.id = "mandatory-login-overlay";
            overlay.innerHTML = `
                <style>
                    #mandatory-login-overlay {
                        position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
                        background: var(--bg-primary, #0f172a); z-index: 999999;
                        display: flex; justify-content: center; align-items: center;
                        padding: 20px; box-sizing: border-box;
                    }
                    .full-page-login {
                        background: var(--bg-secondary, #1e293b); padding: 2.5rem;
                        border-radius: 12px; box-shadow: 0 4px 25px rgba(0,0,0,0.5);
                        text-align: center; max-width: 380px; width: 100%;
                        border: 1px solid var(--border-color, #334155);
                    }
                    .full-page-login input {
                        width: 100%; margin-bottom: 1rem; padding: 0.8rem;
                        border-radius: 6px; border: 1px solid var(--border-color, #475569);
                        background: var(--bg-primary, #0f172a); color: var(--text-main, #f8fafc);
                        font-size: 1rem; box-sizing: border-box;
                    }
                    .full-page-login button {
                        width: 100%; padding: 0.9rem; font-size: 1rem; font-weight: bold;
                        background: #6366f1; color: white; border: none;
                        border-radius: 6px; cursor: pointer; transition: 0.3s;
                    }
                    .full-page-login button:hover { background: #4f46e5; }
                </style>
                <div class="full-page-login">
                    <div class="logo" style="font-size: 2.2rem; margin-bottom: 1rem; font-weight: 800; color: var(--text-main);">THEE<span style="color:var(--accent-color, #6366f1); font-size: inherit; vertical-align: baseline;">HA</span></div>
                    <p style="color: #94a3b8; margin-bottom: 1.5rem; font-size: 0.9rem; line-height: 1.5;">Access Restricted. <br> Please enter your system credentials.</p>
                    <input type="text" id="overlay-auth-user" placeholder="Username" autocomplete="off">
                    <input type="password" id="overlay-auth-pin" placeholder="4-Digit PIN" maxlength="4" autocomplete="off">
                    <button id="overlay-auth-login-btn">Unlock / Join</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // Overlay button ka action bind karo
            document.getElementById("overlay-auth-login-btn").onclick = handleOverlaySubmit;
            return; // Gate locked, stop execution
        }

        // ✅ AGAR USER LOGGED IN HAI -> Normal Flow
        if (window.currentUser && window.currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
            const navbarDrawer = document.getElementById("navbar-links-drawer");
            if (navbarDrawer && !document.getElementById("admin-nav-item-link")) {
                const li = document.createElement("li"); li.id = "admin-nav-item-link";
                li.innerHTML = `<a href="admin.html" style="color:var(--accent-color); font-weight:700;">⭐ Admin Panel</a>`;
                navbarDrawer.appendChild(li);
            }
        }

        // ✅ SUBSCRIBE TO REAL-TIME FLAG UPDATES
        db.collection("users_registry").doc(window.currentUser.toLowerCase()).onSnapshot((doc) => {
            if (doc.exists) {
                const uData = doc.data();
                const canChangePenName = uData.canChangePenName || false;
                
                let badgeHTML = `👤 <span style="margin-left:0.25rem; font-weight:bold; color:var(--text-main);">${window.currentUser}</span>`;
                
                // If flag is true, add the pencil icon
                if (canChangePenName) {
                    badgeHTML += ` <button id="user-change-name-btn" style="background:none; border:none; cursor:pointer; font-size:0.8rem; margin-left:5px;" title="Change Pen Name">✏️</button>`;
                }

                if (window.currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
                    badgeHTML += ' <span style="font-size:0.6rem; background:#ef4444; color:#fff; padding:1px 4px; border-radius:4px; margin-left:0.3rem;">OVERLORD</span>';
                }

                if (container) {
                    container.innerHTML = `<div class="user-badge">${badgeHTML}</div>`;
                }

                // Handle the user pen name identity change logic
                const changeBtn = document.getElementById("user-change-name-btn");
                if (changeBtn) {
                    changeBtn.onclick = async function() {
                        const newName = prompt("Aapna naya Pen Name (Username) likhein:", window.currentUser);
                        if (!newName || newName.trim() === "" || newName === window.currentUser) return;
                        
                        const targetName = newName.trim();
                        const blockedNames = ["admin", "administrator", "moderator", "theeha", "system", "owner"];
                        if (blockedNames.includes(targetName.toLowerCase())) return alert("❌ Yeh naam allowed nahi hai!");
                        
                        const newId = targetName.toLowerCase();
                        const oldName = window.currentUser;
                        const oldId = oldName.toLowerCase();
                        
                        const snapCheck = await db.collection("users_registry").doc(newId).get();
                        if (snapCheck.exists) return alert("❌ Yeh Pen Name pehle se kisi ne le rakha hai!");
                        
                        if (confirm(`Kya aap apna naam "${oldName}" se badal kar "${targetName}" karna chahte hain? Aapki saari purani posts aur comments update ho jayengi.`)) {
                            changeBtn.disabled = true;
                            changeBtn.innerText = "⏳";
                            
                            // Transfer Identity
                            await db.collection("users_registry").doc(newId).set({ 
                                username: targetName, 
                                pin: uData.pin, 
                                deviceOS: uData.deviceOS || "Unknown",
                                deviceModel: uData.deviceModel || "N/A",
                                lastActive: uData.lastActive || null,
                                canChangePenName: false, // Ek baar naam badalne ke baad security ke liye auto-revoke
                                timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                            });
                            
                            await db.collection("users_registry").doc(oldId).delete();
                            
                            // Update Database History
                            const collections = ["kalamkaari", "siebel", "kashmakash"];
                            for (const coll of collections) {
                                const snap = await db.collection(coll).where("author", "==", oldName).get();
                                snap.forEach(d => db.collection(coll).doc(d.id).update({ author: targetName }));

                                const allPosts = await db.collection(coll).get();
                                allPosts.forEach(async (post) => {
                                    const cSnap = await db.collection(coll).doc(post.id).collection("comments").get();
                                    cSnap.forEach(cDoc => {
                                        const t = cDoc.data().text;
                                        if(t.includes(`[👤 ${oldName}]:`) || t.includes(`[👤 ${oldName}]`)) {
                                            db.collection(coll).doc(post.id).collection("comments").doc(cDoc.id).update({
                                                text: t.replace(new RegExp(`\\[👤 ${oldName}\\]`, 'g'), `[👤 ${targetName}]`)
                                            });
                                        }
                                    });
                                });
                            }
                            
                            localStorage.setItem("theeha-user", targetName);
                            alert("✅ Aapka Pen Name successfully update ho gaya hai!");
                            window.location.reload();
                        }
                    };
                }
                
                // Form input fields handling (Allow manual entry if flag is true)
                const authorInput = document.getElementById("input-author") || document.getElementById("blog-author") || document.getElementById("kash-author");
                if (authorInput) { 
                    if (window.currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() || canChangePenName) {
                        authorInput.value = window.currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() ? "admin" : window.currentUser;
                        authorInput.disabled = false; 
                        authorInput.style.opacity = "1";
                    } else {
                        authorInput.value = window.currentUser; 
                        authorInput.disabled = true; 
                        authorInput.style.opacity = "0.6";
                    }
                }

                if (typeof syncSecurityDashboardView === "function") syncSecurityDashboardView();
            }
        });
    };

    // 🔥 Modified Authentication Logic for the Overlay
    async function handleOverlaySubmit() {
        const btn = document.getElementById("overlay-auth-login-btn");
        const u = document.getElementById("overlay-auth-user").value.trim();
        const p = document.getElementById("overlay-auth-pin").value.trim();
        
        if (!u || p.length !== 4 || isNaN(p)) return alert("Enter valid Username and 4-Digit numeric PIN!");

        // 🔒 SECURITY CHECK
        const blockedNames = ["admin", "administrator", "moderator", "theeha", "system", "owner"];
        if (blockedNames.includes(u.toLowerCase())) {
            return alert("❌ Yeh username allowed nahi hai! Kripya koi doosra naam chunein.");
        }

        btn.textContent = "Authenticating...";
        btn.disabled = true;

        if (u.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() && p === MASTER_ADMIN_PIN) {
            localStorage.setItem("theeha-user", MASTER_ADMIN_USER); 
            alert("Authorized Master Admin Overlord."); 
            window.location.reload();
            return;
        }

        const userRef = db.collection("users_registry").doc(u.toLowerCase());
        userRef.get().then(async (doc) => {
            if (doc.exists) {
                if (doc.data().pin === p) { 
                    localStorage.setItem("theeha-user", doc.data().username); 
                    window.location.reload(); 
                } else { 
                    alert("Incorrect PIN for this username!"); 
                    btn.textContent = "Unlock / Join"; btn.disabled = false;
                }
            } else {
                const detectedOS = getDeviceOS();
                const detectedModel = await getMobileModel();

                userRef.set({ 
                    username: u, 
                    pin: p, 
                    deviceOS: detectedOS,       
                    deviceModel: detectedModel,   
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                }).then(() => {
                    localStorage.setItem("theeha-user", u);
                    alert(`New Identity [${u}] registered successfully! 🎉`); 
                    window.location.reload();
                });
            }
        }).catch(err => {
            alert("Registry Error: " + err.message);
            btn.textContent = "Unlock / Join"; btn.disabled = false;
        });
    }

    renderAuthWidgetState();
});