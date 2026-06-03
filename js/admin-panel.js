// ==========================================
// 6. MASTER ADMIN PANEL ENGINE
// ==========================================
window.syncSecurityDashboardView = function() {
    const authCard = document.getElementById("admin-auth-card");
    const dashboard = document.getElementById("admin-panel-dashboard");
    if(!dashboard) return;

    if (currentUser && currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
        if(authCard) authCard.style.display = "none";
        dashboard.style.display = "block";
        
        const saveAdminFlags = () => {
            db.collection("system_flags").doc("config").set({
                live_kalamkaari: document.getElementById("live-kalamkaari").checked,
                live_siebel: document.getElementById("live-siebel").checked,
                live_kashmakash: document.getElementById("live-kashmakash").checked,
                guest_post: document.getElementById("guest-post-flag").checked,
                guest_comment: document.getElementById("guest-comment-flag").checked,
                comments: document.getElementById("flag-comments").checked,
                sharing: document.getElementById("flag-sharing").checked,
                canvas: document.getElementById("flag-canvas").checked,
                search: document.getElementById("flag-search").checked
            }, { merge: true });
        };
        document.querySelectorAll(".admin-panel-box .switch input").forEach(box => { box.onchange = saveAdminFlags; });

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
                row.innerHTML = `
                    <div style="flex:1; padding-right:1rem;"><span class="card-tag" style="background:var(--accent-color); margin-bottom:0.25rem; display:inline-block;">${item.collectionName.toUpperCase()}</span><div style="font-size:0.9rem; font-weight:700;">${item.title || 'No Title'} <span style="font-weight:500; opacity:0.6; font-size:0.8rem;">by ${item.author}</span></div><p style="font-size:0.8rem; opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${item.content}</p></div>
                    <div class="action-buttons">
                        <button class="btn mod-edit-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem; background:#f59e0b; color:white; border:none; border-radius:4px; margin-right:4px; font-weight:600; cursor:pointer;">✏️ Edit</button>
                        <button class="btn mod-approve-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Approve</button>
                        <button class="btn btn-danger mod-reject-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Reject</button>
                    </div>
                `;
                queueListContainer.appendChild(row);
            });

            document.querySelectorAll(".mod-edit-btn").forEach(b => {
                b.onclick = function() {
                    const c = this.getAttribute("data-coll");
                    const id = this.getAttribute("data-id");
                    const dataObj = allPending.find(x => x.id === id && x.collectionName === c);
                    
                    if(dataObj) {
                        document.getElementById("edit-doc-id").value = id; 
                        document.getElementById("edit-doc-coll").value = c;
                        document.getElementById("edit-title-input").value = dataObj.title || ""; 
                        document.getElementById("edit-author-input").value = dataObj.author || ""; 
                        document.getElementById("edit-content-input").value = dataObj.content || "";
                        document.getElementById("edit-likes-input").value = dataObj.likes || 0; 
                        document.getElementById("edit-comments-input").value = dataObj.comments_count || 0; 
                        document.getElementById("edit-shares-input").value = dataObj.shares_count || 0;

                        document.getElementById("edit-title-group").style.display = (c === "siebel") ? "flex" : "none";
                        document.getElementById("edit-canvas-group").style.display = (c === "kalamkaari") ? "flex" : "none";
                        if(c === "kalamkaari") {
                            document.querySelectorAll("#edit-canvas-group .grad-dot").forEach(d => d.classList.remove("active"));
                            const activeDot = document.querySelector(`#edit-canvas-group .grad-dot[data-style="${dataObj.cardStyle || 'grad-default'}"]`);
                            if(activeDot) activeDot.classList.add("active");
                        }
                        document.getElementById("admin-modal-editor").style.display = "flex";
                    }
                };
            });

            document.querySelectorAll(".mod-approve-btn").forEach(b => { b.onclick = function() { db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).update({ status: "approved" }); }; });
            document.querySelectorAll(".mod-reject-btn").forEach(b => { b.onclick = function() { db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete(); }; });
        });
    });
}

function listenToLiveArticlesForDeletionAndEditing() {
    const liveContainer = document.getElementById("admin-live-articles-list");
    if(!liveContainer) return;
    const collections = ["kalamkaari", "siebel", "kashmakash"];
    let activeMap = {};

    if(!document.getElementById("admin-delete-filter-selector")) {
        const filterWrapper = document.createElement("div"); filterWrapper.style.marginBottom = "0.5rem"; filterWrapper.style.display = "flex"; filterWrapper.style.gap = "0.4rem";
        filterWrapper.innerHTML = `<select id="admin-delete-filter-selector" class="sort-select" style="flex:1; font-size:0.8rem; padding:0.3rem;"><option value="ALL"> Show All Categories</option><option value="KALAMKAARI">Kalamkaari Only</option><option value="SIEBEL">Siebel Blogs Only</option><option value="KASHMAKASH">Kashmakash Only</option></select><input type="text" id="admin-delete-search-input" class="sort-select" style="flex:1.2; font-size:0.8rem; padding:0.3rem;" placeholder="🔍 Filter Author / Title...">`;
        liveContainer.parentNode.insertBefore(filterWrapper, liveContainer);
        document.getElementById("admin-delete-filter-selector").onchange = () => renderDeleteQueue();
        document.getElementById("admin-delete-search-input").oninput = () => renderDeleteQueue();
    }

    function renderDeleteQueue() {
        const currentFilter = document.getElementById("admin-delete-filter-selector").value;
        const searchVal = document.getElementById("admin-delete-search-input").value.toLowerCase().trim();
        let allActive = []; collections.forEach(c => { if(currentFilter === "ALL" || currentFilter === c.toUpperCase()) allActive = allActive.concat(activeMap[c] || []); });
        allActive.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        let filteredActive = allActive.filter(item => { return searchVal === "" || (item.author && item.author.toLowerCase().includes(searchVal)) || (item.title && item.title.toLowerCase().includes(searchVal)) || (item.content && item.content.toLowerCase().includes(searchVal)); });

        liveContainer.innerHTML = "";
        if (filteredActive.length === 0) { liveContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">No matching articles found.</p>`; return; }

        filteredActive.forEach(item => {
            const row = document.createElement("div"); row.className = "mod-item-card"; row.style.padding = "0.4rem 0.6rem";
            row.innerHTML = `
                <div style="flex:1; padding-right:0.5rem; overflow:hidden;"><div style="font-size:0.8rem; font-weight:700; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;"><span style="color:var(--accent-color); font-size:0.7rem;">[${item.collectionName.toUpperCase()}]</span> ${item.title || item.content.substring(0, 20)}...</div><div style="font-size:0.7rem; opacity:0.6; margin-top:0.1rem;">By: ${item.author} | ❤️ ${item.likes || 0} | 💬 ${item.comments_count || 0}</div></div>
                <div class="action-buttons"><button class="btn admin-edit-trigger-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.2rem 0.4rem; font-size:0.7rem; background:#eab308;">✏️ Edit</button><button class="btn btn-danger admin-delete-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.2rem 0.4rem; font-size:0.7rem;">🗑️ Delete</button></div>
            `;
            liveContainer.appendChild(row);
        });

        document.querySelectorAll(".admin-edit-trigger-btn").forEach(btn => {
            btn.onclick = function() {
                const c = this.getAttribute("data-coll"); const id = this.getAttribute("data-id");
                const dataObj = activeMap[c].find(x => x.id === id);
                document.getElementById("edit-doc-id").value = id; document.getElementById("edit-doc-coll").value = c;
                document.getElementById("edit-title-input").value = dataObj.title || ""; document.getElementById("edit-author-input").value = dataObj.author || ""; document.getElementById("edit-content-input").value = dataObj.content || "";
                document.getElementById("edit-likes-input").value = dataObj.likes || 0; document.getElementById("edit-comments-input").value = dataObj.comments_count || 0; document.getElementById("edit-shares-input").value = dataObj.shares_count || 0;

                document.getElementById("edit-title-group").style.display = (c === "siebel") ? "flex" : "none";
                document.getElementById("edit-canvas-group").style.display = (c === "kalamkaari") ? "flex" : "none";
                if(c === "kalamkaari") {
                    document.querySelectorAll("#edit-canvas-group .grad-dot").forEach(d => d.classList.remove("active"));
                    const activeDot = document.querySelector(`#edit-canvas-group .grad-dot[data-style="${dataObj.cardStyle || 'grad-default'}"]`);
                    if(activeDot) activeDot.classList.add("active");
                }
                document.getElementById("admin-modal-editor").style.display = "flex";
            };
        });

        document.querySelectorAll(".admin-delete-btn").forEach(btn => { btn.onclick = function() { if (confirm(`Permanently delete from ${this.getAttribute("data-coll").toUpperCase()}?`)) db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete(); }; });
    }

    document.querySelectorAll("#edit-canvas-group .grad-dot").forEach(d => d.onclick = function() { document.querySelectorAll("#edit-canvas-group .grad-dot").forEach(x => x.classList.remove("active")); this.classList.add("active"); });
    document.getElementById("edit-cancel-btn").onclick = () => document.getElementById("admin-modal-editor").style.display = "none";
    document.getElementById("edit-save-btn").onclick = function() {
        const id = document.getElementById("edit-doc-id").value; const c = document.getElementById("edit-doc-coll").value;
        let updatePayload = { author: document.getElementById("edit-author-input").value.trim(), content: document.getElementById("edit-content-input").value.trim(), likes: parseInt(document.getElementById("edit-likes-input").value) || 0, comments_count: parseInt(document.getElementById("edit-comments-input").value) || 0, shares_count: parseInt(document.getElementById("edit-shares-input").value) || 0 };
        if(c === "siebel") updatePayload.title = document.getElementById("edit-title-input").value.trim();
        if(c === "kalamkaari") { const activeDot = document.querySelector("#edit-canvas-group .grad-dot.active"); if(activeDot) updatePayload.cardStyle = activeDot.getAttribute("data-style"); }
        db.collection(c).doc(id).update(updatePayload).then(() => { alert("Updated successfully!"); document.getElementById("admin-modal-editor").style.display = "none"; });
    };

    collections.forEach(coll => { db.collection(coll).where("status", "==", "approved").onSnapshot(s => { activeMap[coll] = []; s.forEach(doc => activeMap[coll].push({ id: doc.id, collectionName: coll, ...doc.data() })); renderDeleteQueue(); }); });
}

function listenToUsersRegistryWatchdog() {
    const usersContainer = document.getElementById("admin-users-registry-list");
    if(!usersContainer) return;

    db.collection("users_registry").orderBy("timestamp", "desc").onSnapshot(s => {
        usersContainer.innerHTML = "";
        if(s.empty) { usersContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">No registered credentials found.</p>`; return; }

        s.forEach(doc => {
            const uData = doc.data(); const userIdNode = doc.id;
            const row = document.createElement("div"); row.className = "mod-item-card"; row.style.padding = "0.4rem 0.6rem";
            row.innerHTML = `
                <div style="flex:1; padding-right:0.4rem;">
                    <div style="font-size:0.82rem; font-weight:700; color:var(--text-main);">
                        👤 User: <input type="text" value="${uData.username}" id="user-name-override-${userIdNode}" style="width:100px; background:var(--bg-primary); color:var(--accent-color); border:1px solid var(--border-color); font-size:0.8rem; padding:1px 4px; border-radius:4px; font-weight:bold;">
                    </div>
                    <div style="font-size:0.72rem; opacity:0.65; margin-top:0.25rem;">
                        PIN Gate Lock: <input type="text" value="${uData.pin}" id="user-pin-override-${userIdNode}" style="width:50px; text-align:center; background:var(--bg-primary); color:var(--text-main); border:1px solid var(--border-color); font-size:0.7rem; padding:1px 4px; border-radius:4px;">
                    </div>
                    
                    <div style="font-size:0.7rem; color:var(--accent-color); margin-top:0.3rem; font-weight:600;">
                        📱 Device: <span style="color:var(--text-main); opacity:0.85; font-weight:500;">${uData.deviceOS || 'Unknown'} (${uData.deviceModel || 'N/A'})</span>
                    </div>
                </div>
                <div class="action-buttons" style="display:flex; flex-direction:column; gap:0.2rem;">
                    <button class="btn user-modify-save-trigger" data-uid="${userIdNode}" data-oldname="${uData.username}" style="padding:0.2rem 0.4rem; font-size:0.7rem; background:#10b981;">💾 Update Profile</button>
                    <button class="btn btn-danger user-ban-trigger" data-uid="${userIdNode}" style="padding:0.2rem 0.4rem; font-size:0.7rem;">🗑️ Ban User</button>
                </div>
            `;
            usersContainer.appendChild(row);
        });

        document.querySelectorAll(".user-modify-save-trigger").forEach(btn => {
            btn.onclick = async function() {
                const uId = this.getAttribute("data-uid");
                const oldName = this.getAttribute("data-oldname");
                const targetName = document.getElementById(`user-name-override-${uId}`).value.trim();
                const targetPin = document.getElementById(`user-pin-override-${uId}`).value.trim();

                if(!targetName || targetPin.length !== 4 || isNaN(targetPin)) return alert("Invalid Name or PIN!");

                if(targetName !== oldName) {
                    const confirmChange = confirm(`Are you sure you want to change username from ${oldName} to ${targetName}? This will automatically update all their previous posts and comments across the database.`);
                    if(!confirmChange) return;

                    const newId = targetName.toLowerCase();
                    
                    // Fetch existing node state safely to preserve phone logs on name update
                    const snapCheck = await db.collection("users_registry").doc(uId).get();
                    const existingData = snapCheck.exists ? snapCheck.data() : {};

                    await db.collection("users_registry").doc(newId).set({ 
                        username: targetName, 
                        pin: targetPin, 
                        deviceOS: existingData.deviceOS || "Unknown",
                        deviceModel: existingData.deviceModel || "N/A",
                        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                    });
                    await db.collection("users_registry").doc(uId).delete();

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
                                        text: t.replace(`[👤 ${oldName}]`, `[👤 ${targetName}]`)
                                    });
                                }
                            });
                        });
                    }
                    alert("Profile & Database History Updated Successfully!");
                } else {
                    db.collection("users_registry").doc(uId).update({ pin: targetPin }).then(() => alert("PIN updated successfully!"));
                }
            };
        });

        document.querySelectorAll(".user-ban-trigger").forEach(btn => {
            btn.onclick = function() { if(confirm(`Permanently ban user [${this.getAttribute("data-uid").toUpperCase()}]?`)) db.collection("users_registry").doc(this.getAttribute("data-uid")).delete(); };
        });
    });
}

// 1. Words Update karne ka Logic
document.getElementById("update-words-btn").addEventListener("click", () => {
    const w1 = document.getElementById("admin-word-1").value.trim();
    const w2 = document.getElementById("admin-word-2").value.trim();

    if(!w1 || !w2) return alert("Dono words likhna zaroori hai!");

    db.collection("challenges").doc("current").set({
        word1: w1,
        word2: w2
    }).then(() => {
        alert("Shabd kamyabi se update ho gaye hain! 🔥");
    }).catch(err => alert("Error: " + err.message));
});

// 2. Push Notification se Invite bhejne ka Logic
document.getElementById("send-challenge-notif-btn").addEventListener("click", () => {
    const w1 = document.getElementById("admin-word-1").value.trim();
    const w2 = document.getElementById("admin-word-2").value.trim();

    if(!w1 || !w2) return alert("Pehle naye words update ka button dabayein, phir invite bhejein!");

    const notifTitle = "🏆 Naya Shabad-Sangram Live!";
    const notifMessage = `Aaj ke 2 shabd hain: "${w1}" aur "${w2}". Dikhaiye apni kalam ka jaadu, abhi likhein!`;
    const targetUrl = "https://theeha.vercel.app/kalamkaari.html";

    fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifTitle, message: notifMessage, url: targetUrl })
    })
    .then(res => res.json())
    .then(data => {
        alert("Sabhi users ko Invitation Notification bhej diya gaya hai! 🚀");
    })
    .catch(err => {
        alert("Notification fail: " + err.message);
    });
});