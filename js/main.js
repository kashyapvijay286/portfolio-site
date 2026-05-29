// TODO: Replace this placeholder object with YOUR real configuration from Firebase Console!
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
const MASTER_ADMIN_USER = "admin909";
const MASTER_ADMIN_PIN = "9090";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. THEME ENGINE ---
    const savedTheme = localStorage.getItem("theeha-theme");
    let activeTheme = savedTheme ? savedTheme : "light";
    if (!savedTheme) localStorage.setItem("theeha-theme", "light");
    document.documentElement.setAttribute("data-theme", activeTheme);

    const themeToggleBtn = document.querySelectorAll("#theme-toggle");
    if(themeToggleBtn.length) themeToggleBtn.forEach(b => b.textContent = activeTheme === "dark" ? "🌙" : "☀️");

    themeToggleBtn.forEach(btn => {
        btn.onclick = function() {
            const targetMode = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", targetMode);
            localStorage.setItem("theeha-theme", targetMode);
            themeToggleBtn.forEach(b => b.textContent = targetMode === "dark" ? "🌙" : "☀️");
        };
    });

    // --- 2. MOBILE MENU ENGINE ---
    const hamburgerTrigger = document.getElementById("hamburger-menu-trigger");
    const navbarDrawer = document.getElementById("navbar-links-drawer");
    if (hamburgerTrigger && navbarDrawer) {
        hamburgerTrigger.onclick = function(e) { e.stopPropagation(); navbarDrawer.classList.toggle("mobile-open"); };
        document.addEventListener("click", () => { navbarDrawer.classList.remove("mobile-open"); });
    }

    // --- 3. SYSTEM FLAGS & CONTROLS ---
    let flags = { comments: true, sharing: true, canvas: true, search: true, live_kalamkaari: true, live_siebel: true, live_kashmakash: true, guest_post: true, guest_comment: true };

    db.collection("system_flags").doc("config").onSnapshot((doc) => {
        if (doc.exists) {
            flags = doc.data();
            const canvasBlock = document.getElementById("admin-flag-canvas");
            const searchBlock = document.getElementById("admin-flag-search");
            if (canvasBlock) canvasBlock.style.display = flags.canvas ? "flex" : "none";
            if (searchBlock) searchBlock.style.display = flags.search ? "block" : "none";

            // FIXED: Only sync admin dashboard flags UI if user is on admin page
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

    // --- 4. SECURE LOGIN GATEWAY ---
    let currentUser = localStorage.getItem("theeha-user") || null;

    function renderAuthWidgetState() {
        const container = document.getElementById("auth-container-gate");
        if(!container) return;

        if (currentUser && currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
            if (navbarDrawer && !document.getElementById("admin-nav-item-link")) {
                const li = document.createElement("li"); li.id = "admin-nav-item-link";
                li.innerHTML = `<a href="admin.html" style="color:var(--accent-color); font-weight:700;">⭐ Admin Panel</a>`;
                navbarDrawer.appendChild(li);
            }
        }

        if (currentUser) {
            container.innerHTML = `
                <div class="user-badge">
                    👤 Bounded User: <span style="margin-left:0.25rem; font-weight:bold; color:var(--text-main);">${currentUser}</span> 
                    ${currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() ? '<span style="font-size:0.6rem; background:#ef4444; color:#fff; padding:1px 4px; border-radius:4px; margin-left:0.3rem;">OVERLORD</span>' : ''}
                </div>
            `;
            const authorInput = document.getElementById("input-author") || document.getElementById("blog-author") || document.getElementById("kash-author");
            if(authorInput) { 
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
            // FIXED: Direct Binding for stable click capture across all pages
            const loginBtn = document.getElementById("auth-login-btn");
            if(loginBtn) loginBtn.onclick = handleIdentityGateSubmit;
        }
        syncSecurityDashboardView();
    }

    function handleIdentityGateSubmit() {
        const u = document.getElementById("auth-user").value.trim();
        const p = document.getElementById("auth-pin").value.trim();
        if(!u || p.length !== 4 || isNaN(p)) return alert("Enter valid Username and 4-Digit numeric PIN!");

        if (u.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() && p === MASTER_ADMIN_PIN) {
            localStorage.setItem("theeha-user", MASTER_ADMIN_USER); currentUser = MASTER_ADMIN_USER;
            if(!window.location.pathname.includes("admin.html")) window.location.replace("admin.html");
            else window.location.reload();
            return;
        }

        const userRef = db.collection("users_registry").doc(u.toLowerCase());
        userRef.get().then(doc => {
            if (doc.exists) {
                if (doc.data().pin === p) { 
                    localStorage.setItem("theeha-user", doc.data().username); currentUser = doc.data().username; window.location.reload(); 
                } else { 
                    alert("Incorrect PIN for this username!"); 
                }
            } else {
                userRef.set({ username: u, pin: p, timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
                    localStorage.setItem("theeha-user", u); currentUser = u;
                    alert(`New Identity [${u}] registered successfully!`); window.location.reload();
                });
            }
        }).catch(err => alert("Registry Error: " + err.message));
    }

    function syncSecurityDashboardView() {
        const authCard = document.getElementById("admin-auth-card");
        const dashboard = document.getElementById("admin-panel-dashboard");
        if(!dashboard) return;

        if (currentUser && currentUser.toLowerCase() === MASTER_ADMIN_USER.toLowerCase()) {
            if(authCard) authCard.style.display = "none";
            dashboard.style.display = "block";
            
            // FIXED: Admin Flags Push Event Isolation Engine
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
    }

    // --- 5. STATS & STUDIO TRIGGERS ---
    const homeKalamkaari = document.getElementById("home-kalamkaari-count");
    if (homeKalamkaari) {
        db.collection("kalamkaari").onSnapshot(s => {
            let approvedSize = 0; let docs = [];
            s.forEach(d => { if(d.data().status !== "pending") { approvedSize++; docs.push(d.data()); } });
            homeKalamkaari.textContent = approvedSize;
            if(docs.length > 0) {
                docs.sort((a,b) => (b.likes || 0) - (a.likes || 0));
                document.getElementById("trending-card-box").innerHTML = `<span style="font-weight:700; color:var(--text-main);">🔥 Trending Pick:</span> "${docs[0].content}" <span style="color:var(--accent-color); font-weight:600;">— ${docs[0].author} (${docs[0].likes || 0} ❤️)</span>`;
            }
        });
        db.collection("siebel").onSnapshot(s => {
            let approvedSize = 0; s.forEach(d => { if(d.data().status !== "pending") approvedSize++; });
            document.getElementById("home-blogs-count").textContent = approvedSize;
        });
        db.collection("kashmakash").onSnapshot(s => {
            let approvedSize = 0; s.forEach(d => { if(d.data().status !== "pending") approvedSize++; });
            document.getElementById("home-kashmakash-count").textContent = approvedSize;
        });
    }

    const toggleFormBtn = document.getElementById("toggle-form-btn");
    if (toggleFormBtn) {
        const target = toggleFormBtn.getAttribute("data-target");
        const targetForm = document.getElementById(`compose-form-${target}`);
        if(targetForm) targetForm.style.setProperty("display", "none", "important");

        toggleFormBtn.onclick = function() {
            if(!currentUser && !flags.guest_post) return alert("Submissions Locked: Guests cannot post content!");
            if (targetForm.style.getPropertyValue("display") === "none") {
                targetForm.style.setProperty("display", "flex", "important");
                toggleFormBtn.textContent = "➖ Close Studio";
            } else {
                targetForm.style.setProperty("display", "none", "important");
                toggleFormBtn.textContent = target === "siebel" ? "✒️ Write a Blog" : (target === "kashmakash" ? "✒️ Write a Thought" : "✒️ Write a Piece");
            }
        };
    }

    // --- 6. USER SUBMISSION DISPATCH ---
    const submitBtn = document.getElementById("submit-btn"); 
    const blogSubmitBtn = document.getElementById("blog-submit-btn"); 
    const kashSubmitBtn = document.getElementById("kash-submit-btn"); 

    if(submitBtn) {
        let selectedStyle = "grad-default";
        document.querySelectorAll("#compose-form-kalamkaari .grad-dot").forEach(d => d.onclick = function() {
            document.querySelectorAll("#compose-form-kalamkaari .grad-dot").forEach(x => x.classList.remove("active"));
            this.classList.add("active"); selectedStyle = this.getAttribute("data-style");
        });
        submitBtn.onclick = function() {
            if(!currentUser && !flags.guest_post) return alert("Submission Rejected!");
            const txt = document.getElementById("input-content").value.trim(); if(!txt) return;
            pushContent("kalamkaari", {
                content: txt, author: document.getElementById("input-author").value.trim() || "Anonymous",
                tag: document.getElementById("input-tag").value, cardStyle: flags.canvas ? selectedStyle : "grad-default", likes: 0, views: 0, comments_count: 0, shares_count: 0
            }, flags.live_kalamkaari);
            document.getElementById("input-content").value = ""; 
            document.getElementById(`compose-form-kalamkaari`).style.setProperty("display", "none", "important");
            toggleFormBtn.textContent = "✒️ Write a Piece";
        };
    }

    if(blogSubmitBtn) {
        blogSubmitBtn.onclick = function() {
            if(!currentUser && !flags.guest_post) return alert("Submission Rejected!");
            const txt = document.getElementById("blog-content").value.trim();
            const title = document.getElementById("blog-title").value.trim();
            if(!txt || !title) return alert("Title and Content are required!");
            pushContent("siebel", {
                title: title, content: txt, author: document.getElementById("blog-author").value.trim() || "Anonymous",
                image: document.getElementById("blog-img").value.trim(), fontWeight: document.getElementById("blog-font-weight").value, textColor: document.getElementById("blog-text-color").value,
                likes: 0, views: 0, comments_count: 0, shares_count: 0
            }, flags.live_siebel);
            ["blog-content", "blog-title", "blog-img"].forEach(id => document.getElementById(id).value = "");
            document.getElementById(`compose-form-siebel`).style.setProperty("display", "none", "important");
            toggleFormBtn.textContent = "✒️ Write a Blog";
        };
    }

    if(kashSubmitBtn) {
        kashSubmitBtn.onclick = function() {
            if(!currentUser && !flags.guest_post) return alert("Submission Rejected!");
            const txt = document.getElementById("kash-content").value.trim(); if(!txt) return alert("Content required!");
            pushContent("kashmakash", { content: txt, author: document.getElementById("kash-author").value.trim() || "Anonymous", likes: 0, views: 0, comments_count: 0, shares_count: 0 }, flags.live_kashmakash);
            document.getElementById("kash-content").value = "";
            document.getElementById(`compose-form-kashmakash`).style.setProperty("display", "none", "important");
            toggleFormBtn.textContent = "✒️ Write a Thought";
        };
    }

    function pushContent(collection, payload, isLiveDirectly) {
        payload.status = isLiveDirectly ? "approved" : "pending";
        payload.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        db.collection(collection).add(payload).then(() => {
            alert(isLiveDirectly ? "Published successfully!" : "Submitted safely! Awaiting verification.");
            window.location.reload();
        });
    }

    // --- 7. FIXED FIREWALL FOR INFINITE VIEWS ---
    const sessionTrackedViews = new Set(); // Browser memory strict barrier
    
    function trackCardViewLogsOnce(collection, docId) {
        if(sessionTrackedViews.has(docId)) return; // Block duplicates instantly
        sessionTrackedViews.add(docId);
        
        db.collection(collection).doc(docId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(e => console.log(e));
    }

    // --- 8. PUBLIC MULTI-CARD FEEDS CONSOLE ---
    const feedContainer = document.getElementById("feed-container"); 
    if(feedContainer) {
        const sortSelect = document.getElementById("sort-feed");
        const filterTag = document.getElementById("filter-tag");
        const searchInput = document.getElementById("search-input");
        let cache = [];

        function loadKalamkaari() {
            db.collection("kalamkaari").onSnapshot(s => { 
                cache = []; 
                s.forEach(d => { 
                    const item = d.data();
                    if (item.status === "approved" || !item.status) { cache.push({id: d.id, ...item}); } 
                }); 
                if (sortSelect.value === "likes") cache.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                else cache.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                applyFiltersAndRender(); 
            });
        }

        window.applyFiltersAndRender = function() {
            const tVal = filterTag.value ? filterTag.value : "All"; 
            const sVal = searchInput.value ? searchInput.value.toLowerCase().trim() : "";
            feedContainer.innerHTML = "";
            
            let filtered = cache.filter(item => {
                const matchesTag = (tVal === "All" || item.tag === tVal);
                const matchesSearch = sVal === "" || (item.content && item.content.toLowerCase().includes(sVal)) || (item.author && item.author.toLowerCase().includes(sVal));
                return matchesTag && matchesSearch;
            });

            filtered.forEach(item => {
                const card = document.createElement("div"); card.className = `article-card ${item.cardStyle || 'grad-default'}`;
                card.innerHTML = `
                    <div class="quote-row"><div class="article-text">"${item.content}"</div></div>
                    <div class="article-meta-row">
                        <div class="article-author"><b>${item.author}</b> &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0}</span></div>
                        <span class="card-tag">${item.tag || 'General'}</span>
                    </div>
                    <div class="instagram-action-bar">
                        <button class="ig-btn like-btn" data-coll="kalamkaari" data-id="${item.id}">❤️ <span class="ig-count-label">${item.likes || 0}</span></button>
                        <button class="ig-btn comment-trigger-btn" data-id="${item.id}">💬 <span class="ig-count-label" id="comment-lbl-cnt-${item.id}">${item.comments_count || 0}</span></button>
                        <button class="ig-btn share-btn" data-coll="kalamkaari" data-id="${item.id}" data-text="${encodeURIComponent(item.content)}">📤 <span class="ig-count-label">${item.shares_count || 0}</span></button>
                    </div>
                    ${generateCommentsDOM(item.id, "kalamkaari")}
                `;
                feedContainer.appendChild(card);
                hookCommentsListener(item.id, "kalamkaari");
                trackCardViewLogsOnce("kalamkaari", item.id);
            });
            attachActionListeners();
        };
        [sortSelect, filterTag].forEach(el => el.onchange = loadKalamkaari);
        searchInput.oninput = applyFiltersAndRender;
        loadKalamkaari();
    }

    function renderStandaloneFeed(collName, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;

        db.collection(collName).onSnapshot(s => {
            let localCache = [];
            s.forEach(doc => { const item = doc.data(); if (item.status !== "pending") { localCache.push({ id: doc.id, ...item }); } });
            localCache.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            container.innerHTML = "";
            
            if(localCache.length === 0) { container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:2rem;">No published content found here yet.</p>`; return; }
            
            localCache.forEach((item, index) => {
                const serialNumber = localCache.length - index; const isBlog = (collName === "siebel");
                const card = document.createElement("div"); card.className = "article-card grad-default";
                
                let headerHTML = (isBlog && item.title) ? `<div style="background: rgba(167, 139, 250, 0.12); border-left: 4px solid var(--accent-color); padding: 0.5rem 0.8rem; border-radius: 0 6px 6px 0; margin-bottom: 0.75rem; text-align: left;"><div class="card-title-header" style="font-size: 1.15rem; font-weight: 700; margin: 0; line-height: 1.3;">${item.title}</div></div>` : (item.title ? `<div class="card-title-header" style="text-align: center; margin-bottom: 0.4rem;">${item.title}</div>` : '');

                const weightClass = item.fontWeight === "bold" ? "txt-weight-bold" : "";
                const colorClass = item.textColor ? `txt-color-${item.textColor}` : "txt-color-default";

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;"><span class="card-tag" style="background:var(--accent-color); font-weight:700;"># ${serialNumber}</span></div>
                    ${headerHTML}
                    <div class="quote-row"><div class="article-text ${weightClass} ${colorClass}" id="text-canvas-${item.id}" style="${isBlog ? 'font-size:0.92rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;' : ''}">${item.content}</div></div>
                    ${item.image ? `<img src="${item.image}" class="blog-embedded-img" id="img-canvas-${item.id}" style="${isBlog ? 'display:none;' : ''}" onerror="this.style.display='none'">` : ''}
                    ${isBlog ? `<div style="margin-top:0.5rem; text-align: left;"><span id="trigger-btn-${item.id}" class="card-tag" style="background:var(--bg-primary); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; font-weight:600;">📖 Read Full Blog</span></div>` : ''}
                    <div class="article-meta-row"><div class="article-author"><b>${item.author}</b> &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0}</span></div></div>
                    
                    <div class="instagram-action-bar">
                        <button class="ig-btn like-btn" data-coll="${collName}" data-id="${item.id}">❤️ <span class="ig-count-label">${item.likes || 0}</span></button>
                        <button class="ig-btn comment-trigger-btn" data-id="${item.id}">💬 <span class="ig-count-label" id="comment-lbl-cnt-${item.id}">${item.comments_count || 0}</span></button>
                        <button class="ig-btn share-btn" data-coll="${collName}" data-id="${item.id}" data-text="${encodeURIComponent(item.content)}">📤 <span class="ig-count-label">${item.shares_count || 0}</span></button>
                    </div>
                    ${generateCommentsDOM(item.id, collName)}
                `;
                container.appendChild(card);
                hookCommentsListener(item.id, collName);
                trackCardViewLogsOnce(collName, item.id);

                if(isBlog) {
                    const trig = document.getElementById(`trigger-btn-${item.id}`);
                    const textCanvas = document.getElementById(`text-canvas-${item.id}`);
                    const imgCanvas = document.getElementById(`img-canvas-${item.id}`);
                    trig.onclick = function() {
                        if(textCanvas.style.display === "-webkit-box") { textCanvas.style.display = "block"; textCanvas.style.webkitLineClamp = "unset"; if(imgCanvas) imgCanvas.style.display = "block"; trig.textContent = "❌ Read Less"; } 
                        else { textCanvas.style.display = "-webkit-box"; textCanvas.style.webkitLineClamp = "3"; if(imgCanvas) imgCanvas.style.display = "none"; trig.textContent = "📖 Read Full Blog"; }
                    };
                }
            });
            attachActionListeners();
        });
    }

    // --- 9. MASTER ADMIN SUITES ---
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
                        <div class="action-buttons"><button class="btn mod-approve-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Approve</button><button class="btn btn-danger mod-reject-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Reject</button></div>
                    `;
                    queueListContainer.appendChild(row);
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

    // --- 10. NEW FEATURE: UNIVERSAL USERNAME EDITOR ---
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
                    </div>
                    <div class="action-buttons" style="display:flex; flex-direction:column; gap:0.2rem;">
                        <button class="btn user-modify-save-trigger" data-uid="${userIdNode}" data-oldname="${uData.username}" style="padding:0.2rem 0.4rem; font-size:0.7rem; background:#10b981;">💾 Update Profile</button>
                        <button class="btn btn-danger user-ban-trigger" data-uid="${userIdNode}" style="padding:0.2rem 0.4rem; font-size:0.7rem;">🗑️ Ban User</button>
                    </div>
                `;
                usersContainer.appendChild(row);
            });

            // FIXED: Global Find & Replace Routine for changing username everywhere
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
                        
                        // 1. Create new User Registry entry and delete old one
                        await db.collection("users_registry").doc(newId).set({ username: targetName, pin: targetPin, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                        await db.collection("users_registry").doc(uId).delete();

                        // 2. Scan and Overwrite the entire database (Posts + Comments)
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

    // --- REUSABLE ATTRIBUTES COMPONENTS ---
    function generateCommentsDOM(id, coll) {
        return `<div class="comments-section" id="comments-box-node-${id}"><div class="comment-input-block"><input type="text" placeholder="Add comment..." class="c-input"><button class="btn c-send-btn" data-coll="${coll}" data-id="${id}" style="padding:0.2rem 0.6rem; font-size:0.75rem;">Add</button></div><ul class="comment-list" id="comments-list-${id}"></ul></div>`;
    }

    function attachActionListeners() {
        document.querySelectorAll(".comment-trigger-btn").forEach(btn => {
            btn.onclick = function() {
                if(!currentUser && !flags.guest_comment) return alert("Interaction Blocked: Please log in first!");
                const id = this.getAttribute("data-id"); const targetBox = document.getElementById(`comments-box-node-${id}`);
                if(targetBox) targetBox.style.display = (targetBox.style.display === "block") ? "none" : "block";
            };
        });

        document.querySelectorAll(".like-btn").forEach(btn => {
            const id = btn.getAttribute("data-id"); const coll = btn.getAttribute("data-coll");
            if (localStorage.getItem(`liked_${id}`) === "true") btn.classList.add("liked");

            btn.onclick = function(e) {
                e.preventDefault();
                const ref = db.collection(coll).doc(id); const hasLiked = this.classList.contains("liked");
                const countSpan = this.querySelector(".ig-count-label"); let currentLikes = parseInt(countSpan.textContent) || 0;

                if (hasLiked) {
                    this.classList.remove("liked"); localStorage.removeItem(`liked_${id}`);
                    currentLikes--; countSpan.textContent = currentLikes;
                    ref.update({ likes: firebase.firestore.FieldValue.increment(-1) });
                } else {
                    this.classList.add("liked"); localStorage.setItem(`liked_${id}`, "true");
                    currentLikes++; countSpan.textContent = currentLikes;
                    ref.update({ likes: firebase.firestore.FieldValue.increment(1) });
                }
            };
        });
        
        document.querySelectorAll(".share-btn").forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute("data-id"); const coll = this.getAttribute("data-coll");
                const countSpan = this.querySelector(".ig-count-label"); let currentShares = parseInt(countSpan.textContent) || 0;
                currentShares++; countSpan.textContent = currentShares;
                db.collection(coll).doc(id).update({ shares_count: firebase.firestore.FieldValue.increment(1) }).then(() => {
                    window.open(`https://api.whatsapp.com/send?text=*Theeha Piece:* "${this.getAttribute("data-text")}" %0A%0A Explore: ${window.location.href}`, "_blank");
                });
            };
        });
        
        document.querySelectorAll(".c-send-btn").forEach(btn => {
            btn.onclick = function() {
                if(!currentUser && !flags.guest_comment) return alert("Comment Blocked: Please log in first!");
                const id = btn.getAttribute("data-id"); const coll = btn.getAttribute("data-coll");
                const input = this.parentElement.querySelector(".c-input"); if(!input.value.trim()) return;
                
                const authorSignature = currentUser ? `[👤 ${currentUser}]:` : `[👤 Guest]:`;
                const finalCommentString = `${authorSignature} ${input.value.trim()}`;
                
                db.collection(coll).doc(id).collection("comments").add({ text: finalCommentString, timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
                    db.collection(coll).doc(id).update({ comments_count: firebase.firestore.FieldValue.increment(1) }).then(() => {
                        input.value = "";
                    });
                });
            };
        });
    }

    function hookCommentsListener(id, coll) {
        const list = document.getElementById(`comments-list-${id}`);
        db.collection(coll).doc(id).collection("comments").orderBy("timestamp", "asc").onSnapshot(s => {
            if(!list) return; list.innerHTML = "";
            s.forEach(d => { const li = document.createElement("li"); li.className = "comment-item"; li.textContent = d.data().text; list.appendChild(li); });
            const lbl = document.getElementById(`comment-lbl-cnt-${id}`); if(lbl) lbl.textContent = s.size;
        });
    }

    renderAuthWidgetState();
});