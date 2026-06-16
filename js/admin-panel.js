// ==========================================
// 6. MASTER ADMIN PANEL ENGINE
// ==========================================
window.syncSecurityDashboardView = function() {
    const authCard = document.getElementById("admin-auth-card");
    const dashboard = document.getElementById("admin-panel-dashboard");
    if(!dashboard) return;

    if (typeof currentUser !== "undefined" && currentUser && currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
        if(authCard) authCard.style.display = "none";
        dashboard.style.display = "block";
        
        // Load System Config Flags & Restricted Names
        db.collection("system_flags").doc("config").get().then(doc => {
            if(doc.exists) {
                let data = doc.data();
                if(data.restricted_names) document.getElementById("restricted-names-input").value = data.restricted_names;
                
                // Load flags accurately
                document.getElementById("live-kalamkaari").checked = data.live_kalamkaari || false;
                document.getElementById("live-siebel").checked = data.live_siebel || false;
                document.getElementById("live-kashmakash").checked = data.live_kashmakash || false;
                document.getElementById("guest-global-access").checked = data.guest_global_access !== false;
                document.getElementById("guest-post-flag").checked = data.guest_post || false;
                document.getElementById("guest-comment-flag").checked = data.guest_comment || false;
                
                // Guest Page Locks states mapping
                document.getElementById("lock-kalamkaari-guest").checked = data.lock_kalamkaari_guest || false;
                document.getElementById("lock-siebel-guest").checked = data.lock_siebel_guest || false;
                document.getElementById("lock-kashmakash-guest").checked = data.lock_kashmakash_guest || false;

                document.getElementById("flag-comments").checked = data.comments || false;
                document.getElementById("flag-sharing").checked = data.sharing || false;
                document.getElementById("flag-canvas").checked = data.canvas || false;
                document.getElementById("flag-search").checked = data.search || false;
            }
        });

        document.getElementById("save-restricted-names-btn").onclick = () => {
            const names = document.getElementById("restricted-names-input").value.trim();
            db.collection("system_flags").doc("config").set({ restricted_names: names }, { merge: true })
            .then(() => alert("✅ Restricted Names Saved!"))
            .catch(err => alert("Error: " + err.message));
        };

        const saveAdminFlags = () => {
            db.collection("system_flags").doc("config").set({
                live_kalamkaari: document.getElementById("live-kalamkaari").checked,
                live_siebel: document.getElementById("live-siebel").checked,
                live_kashmakash: document.getElementById("live-kashmakash").checked,
                guest_global_access: document.getElementById("guest-global-access").checked,
                guest_post: document.getElementById("guest-post-flag").checked,
                guest_comment: document.getElementById("guest-comment-flag").checked,
                
                // Save advanced page lock modifications safely
                lock_kalamkaari_guest: document.getElementById("lock-kalamkaari-guest").checked,
                lock_siebel_guest: document.getElementById("lock-siebel-guest").checked,
                lock_kashmakash_guest: document.getElementById("lock-kashmakash-guest").checked,

                comments: document.getElementById("flag-comments").checked,
                sharing: document.getElementById("flag-sharing").checked,
                canvas: document.getElementById("flag-canvas").checked,
                search: document.getElementById("flag-search").checked
            }, { merge: true });
        };
        
        // Listen to any toggle switches modifications
        document.querySelectorAll(".admin-panel-box input[type='checkbox']").forEach(box => { box.onchange = saveAdminFlags; });

        if(!window.adminListenersActive) {
            listenToModerationQueues();
            listenToLiveArticlesForDeletionAndEditing();
            listenToUsersRegistryWatchdog();
            window.adminListenersActive = true;
        }
    } else {
        if(authCard) authCard.style.display = "block";
        dashboard.style.display = "none";
    }
};

function listenToModerationQueues() {
    const queueListContainer = document.getElementById("admin-queue-list");
    const queueCountSpan = document.getElementById("mod-queue-count");
    if(!queueListContainer) return;
    const collections = ["kalamkaari", "siebel", "kashmakash"];
    let pendingMap = {};

    collections.forEach(coll => {
        db.collection(coll).where("status", "==", "pending").onSnapshot(s => {
            pendingMap[coll] = []; s.forEach(doc => pendingMap[coll].push({ id: doc.id, collectionName: coll, ...doc.data() }));
            let allPending = []; collections.forEach(c => allPending = allPending.concat(pendingMap[c] || []));
            queueCountSpan.textContent = allPending.length; queueListContainer.innerHTML = "";

            if(allPending.length === 0) { queueListContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1rem;">Queue is clean.</p>`; return; }
            
            allPending.forEach(item => {
                const row = document.createElement("div"); row.className = "mod-item-card";
                row.style.cssText = "display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.8rem; padding: 0.6rem; margin-bottom: 0.5rem;";
                let realAuthorBadge = item.realUserId && item.realUserId !== "Guest" ? `<span style="color:#ef4444; font-weight:800; background:rgba(239, 68, 68, 0.1); padding:2px 5px; border-radius:4px; margin-left:4px;">(@${item.realUserId})</span>` : '';

                row.innerHTML = `
                    <div style="flex: 1; min-width: 250px; padding-right: 0.5rem;">
                        <span class="card-tag" style="background:var(--accent-color); margin-bottom:0.25rem; display:inline-block;">${item.collectionName.toUpperCase()}</span>
                        <div style="font-size:0.9rem; font-weight:700; word-break: break-word;">${item.title || 'No Title'} <span style="font-weight:500; opacity:0.8; font-size:0.8rem;">by ${item.author} ${realAuthorBadge}</span></div>
                        <p style="font-size:0.8rem; opacity:0.8; word-break: break-word; margin-top: 0.2rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.content}</p>
                    </div>
                    <div class="action-buttons" style="display: flex; gap: 0.3rem;">
                        <button class="btn mod-approve-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Approve</button>
                        <button class="btn btn-danger mod-reject-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Reject</button>
                    </div>
                `;
                queueListContainer.appendChild(row);
            });
            document.querySelectorAll(".mod-approve-btn").forEach(b => { b.onclick = function() { db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).update({ status: "approved" }); }; });
            document.querySelectorAll(".mod-reject-btn").forEach(b => { db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete(); }; });
        });
    });
}

function listenToLiveArticlesForDeletionAndEditing() {
    const liveContainer = document.getElementById("admin-live-articles-list");
    if(!liveContainer) return;
    const collections = ["kalamkaari", "siebel", "kashmakash"];
    let activeMap = {};

    function renderDeleteQueue() {
        let allActive = []; collections.forEach(c => { allActive = allActive.concat(activeMap[c] || []); });
        allActive.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        liveContainer.innerHTML = "";
        if (allActive.length === 0) { liveContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">No matching articles found.</p>`; return; }

        allActive.forEach(item => {
            const row = document.createElement("div"); row.className = "mod-item-card";
            row.style.cssText = "display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.6rem; padding: 0.5rem 0.6rem; margin-bottom: 0.4rem;";
            let realAuthorBadge = item.realUserId && item.realUserId !== "Guest" ? `<span style="color:#ef4444; font-weight:800; background:rgba(239, 68, 68, 0.1); padding:2px 4px; border-radius:4px;">(@${item.realUserId})</span>` : '';

            row.innerHTML = `
                <div style="flex: 1; min-width: 220px; overflow: hidden;">
                    <div style="font-size:0.8rem; font-weight:700; word-break: break-word;"><span style="color:var(--accent-color); font-size:0.7rem;">[${item.collectionName.toUpperCase()}]</span> ${item.title || item.content.substring(0, 30)}...</div>
                    <div style="font-size:0.7rem; opacity:0.8; margin-top:0.1rem;">By: ${item.author} ${realAuthorBadge} | ❤️ ${item.likes || 0}</div>
                </div>
                <div class="action-buttons" style="display:flex; gap: 5px;">
                    <button class="btn admin-edit-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.2rem 0.4rem; font-size:0.7rem; background:#3b82f6; border:none; color:white;">✏️ Edit</button>
                    <button class="btn btn-danger admin-delete-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.2rem 0.4rem; font-size:0.7rem;">🗑️ Delete</button>
                </div>
            `;
            liveContainer.appendChild(row);
        });

        // ✏️ FIX: FULL ADVANCED FIELD EDITOR LOGIC (Post के सभी फील्ड्स एडिट करें)
        document.querySelectorAll(".admin-edit-btn").forEach(btn => { 
            btn.onclick = async function() { 
                const coll = this.getAttribute("data-coll");
                const id = this.getAttribute("data-id");
                try {
                    const docSnap = await db.collection(coll).doc(id).get();
                    if(docSnap.exists) {
                        const data = docSnap.data();
                        let updateData = {};

                        // 1. Title (अगर मौजूद हो या Siebel/Kalamkaari हो)
                        if (data.hasOwnProperty('title') || coll === 'siebel' || coll === 'kalamkaari') {
                            const newTitle = prompt("✏️ Edit Title:", data.title || "");
                            if (newTitle !== null) updateData.title = newTitle;
                        }

                        // 2. Author / Pen Name
                        const newAuthor = prompt("✏️ Edit Author Name / Pen Name:", data.author || "");
                        if (newAuthor !== null) updateData.author = newAuthor;

                        // 3. Content
                        const newContent = prompt("✏️ Edit Main Content:", data.content || "");
                        if (newContent !== null) updateData.content = newContent;

                        // 4. Cover Image URL (सिर्फ Siebel या जहाँ इमेज उपलब्ध हो)
                        if (data.hasOwnProperty('img') || data.hasOwnProperty('image') || coll === 'siebel') {
                            const currentImg = data.img || data.image || "";
                            const newImg = prompt("✏️ Edit Cover Image URL:", currentImg);
                            if (newImg !== null) {
                                if (data.hasOwnProperty('image')) updateData.image = newImg;
                                else updateData.img = newImg;
                            }
                        }

                        // 5. Likes Count
                        const newLikes = prompt("✏️ Edit Likes Count:", data.likes || 0);
                        if (newLikes !== null) updateData.likes = Number(newLikes) || 0;

                        // 6. Real User ID Track Badge
                        const newRealUser = prompt("✏️ Edit Real User ID (@username):", data.realUserId || "");
                        if (newRealUser !== null) updateData.realUserId = newRealUser;

                        // डेटाबेस अपडेट ट्रिगर
                        if (Object.keys(updateData).length > 0) {
                            await db.collection(coll).doc(id).update(updateData);
                            alert("✅ Post کے سبھی Fields सफलतापूर्वक अपडेट हो गए!");
                        }
                    }
                } catch(e) {
                    alert("Error editing: " + e.message);
                }
            }; 
        });

        document.querySelectorAll(".admin-delete-btn").forEach(btn => { btn.onclick = function() { if (confirm(`Permanently Delete?`)) db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete(); }; });
    }
    collections.forEach(coll => { db.collection(coll).where("status", "==", "approved").onSnapshot(s => { activeMap[coll] = []; s.forEach(doc => activeMap[coll].push({ id: doc.id, collectionName: coll, ...doc.data() })); renderDeleteQueue(); }); });
}

function listenToUsersRegistryWatchdog() {
    const usersContainer = document.getElementById("admin-users-registry-list");
    if(!usersContainer) return;

    db.collection("users_registry").onSnapshot(s => {
        usersContainer.innerHTML = "";
        let usersArray = [];
        
        s.forEach(doc => {
            if(doc.id !== "guest_id") {
                usersArray.push({ id: doc.id, ...doc.data() });
            }
        });

        // Client-side sorting (Latest users first)
        usersArray.sort((a, b) => {
            let timeA = a.timestamp ? (a.timestamp.seconds || 0) : 0;
            let timeB = b.timestamp ? (b.timestamp.seconds || 0) : 0;
            return timeB - timeA;
        });

        if(usersArray.length === 0) {
            usersContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">No users found.</p>`;
            return;
        }

        // 🚀 FIX: FULL USER DETAILS DISPLAY (PIN और Joined Date/Time भी दिखाएगा)
        usersArray.forEach(uData => {
            let isPenNameChecked = uData.canUsePenName ? 'checked' : '';
            
            // टाइमस्टैम्प को पठनीय प्रारूप (Readable Format) में बदलें
            let formattedDate = "N/A";
            if (uData.timestamp) {
                const dateObj = uData.timestamp.toDate ? uData.timestamp.toDate() : new Date(uData.timestamp);
                formattedDate = dateObj.toLocaleString();
            }

            const row = document.createElement("div"); row.className = "mod-item-card";
            row.style.cssText = "display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; padding: 0.5rem 0.6rem; margin-bottom: 0.4rem;";
            row.innerHTML = `
                <div style="flex: 1; min-width: 200px;">
                    <div style="font-size:0.85rem; font-weight:700; color: var(--text-main);">👤 User: <span style="color: var(--accent-color);">${uData.username || uData.id}</span></div>
                    <div style="font-size:0.75rem; color: var(--text-muted); margin-top: 2px;">
                        🔑 PIN: <strong style="color: #f59e0b; font-family: monospace; font-size:0.8rem;">${uData.pin || 'N/A'}</strong> | 📅 Joined: ${formattedDate}
                    </div>
                    <div style="font-size:0.75rem; display:flex; align-items:center; gap:5px; margin-top:6px;">
                        <label class="switch" style="width:30px; height:16px;"><input type="checkbox" class="pen-name-toggle" data-uid="${uData.id}" ${isPenNameChecked}><span class="slider"></span></label> 
                        <span>Allow Custom Pen Name</span>
                    </div>
                </div>
                <div class="action-buttons"><button class="btn btn-danger user-ban-trigger" data-uid="${uData.id}" style="padding:0.2rem 0.4rem; font-size:0.7rem;">🗑️ Ban User</button></div>
            `;
            usersContainer.appendChild(row);
        });
        
        document.querySelectorAll(".pen-name-toggle").forEach(toggle => {
            toggle.onchange = function() { db.collection("users_registry").doc(this.getAttribute("data-uid")).update({ canUsePenName: this.checked }); };
        });
        document.querySelectorAll(".user-ban-trigger").forEach(btn => {
            btn.onclick = function() { if(confirm(`Ban user?`)) db.collection("users_registry").doc(this.getAttribute("data-uid")).delete(); };
        });
    }, error => {
        console.error("Firebase Rule Error: ", error);
        usersContainer.innerHTML = `<p style="color:red; font-size:0.8rem; text-align:center; padding:1rem;">Error fetching users. Check console.</p>`;
    });
}

// 🚀 BULLETPROOF AUTO-START THE ADMIN ENGINE
function bootAdminDashboard() {
    if (typeof window.syncSecurityDashboardView === "function") {
        window.syncSecurityDashboardView();
    }
}
if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(bootAdminDashboard, 150);
} else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(bootAdminDashboard, 150));
}