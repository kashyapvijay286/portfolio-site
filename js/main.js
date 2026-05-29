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
    
    // --- Requirement 1: DEFAULT TO BRIGHT MODE ON FIRST EVER VISITS ---
    const savedTheme = localStorage.getItem("theeha-theme");
    let activeTheme = "light"; // Force default light state

    if (savedTheme) {
        activeTheme = savedTheme;
    } else {
        localStorage.setItem("theeha-theme", "light");
    }
    document.documentElement.setAttribute("data-theme", activeTheme);

    // --- LIGHT/DARK TOGGLE PROCESSOR ---
    const themeToggleBtn = document.querySelectorAll("#theme-toggle");
    if(themeToggleBtn.length) themeToggleBtn.forEach(b => b.textContent = activeTheme === "dark" ? "🌙" : "☀️");

    themeToggleBtn.forEach(btn => {
        btn.onclick = function() {
            const currentMode = document.documentElement.getAttribute("data-theme");
            const targetMode = currentMode === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", targetMode);
            localStorage.setItem("theeha-theme", targetMode);
            themeToggleBtn.forEach(b => b.textContent = targetMode === "dark" ? "🌙" : "☀️");
        };
    });

    // --- Requirement 2: MOBILE HAMBURGER MENU DRAWER SLIDER ENGINE ---
    const hamburgerTrigger = document.getElementById("hamburger-menu-trigger");
    const navbarDrawer = document.getElementById("navbar-links-drawer");
    if (hamburgerTrigger && navbarDrawer) {
        hamburgerTrigger.onclick = function(e) {
            e.stopPropagation();
            navbarDrawer.classList.toggle("mobile-open");
        };
        document.addEventListener("click", () => {
            navbarDrawer.classList.remove("mobile-open");
        });
    }

    let flags = { comments: true, sharing: true, canvas: true, search: true, live_kalamkaari: true, live_siebel: true, live_kashmakash: true, guest_post: true, guest_comment: true };

    db.collection("system_flags").doc("config").onSnapshot((doc) => {
        if (doc.exists) {
            flags = doc.data();
            const canvasBlock = document.getElementById("admin-flag-canvas");
            const searchBlock = document.getElementById("admin-flag-search");
            if (canvasBlock) canvasBlock.style.display = flags.canvas ? "flex" : "none";
            if (searchBlock) searchBlock.style.display = flags.search ? "block" : "none";
            
            syncSecurityDashboardView();
            if (document.getElementById("feed-container")) loadKalamkaari();
            if (document.getElementById("blogs-feed-container")) renderStandaloneFeed("siebel", "blogs-feed-container");
            if (document.getElementById("kashmakash-feed-container")) renderStandaloneFeed("kashmakash", "kashmakash-feed-container");
        }
    });

    // --- AUTHENTICATION REGISTRY ROUTINES ---
    let currentUser = localStorage.getItem("theeha-user") || null;

    function renderAuthWidgetState() {
        const container = document.getElementById("auth-container-gate");
        if(!container) return;

        if (currentUser) {
            container.innerHTML = `
                <div class="user-badge">
                    👤 <span>${currentUser}</span> ${currentUser === MASTER_ADMIN_USER ? '<span style="font-size:0.6rem; background:#ef4444; color:#fff; padding:1px 4px; border-radius:4px;">OVERLORD</span>' : ''}
                    <button class="btn" id="auth-logout-btn" style="padding:0.15rem 0.4rem; font-size:0.7rem; background:#475569;">Exit</button>
                </div>
            `;
            document.getElementById("auth-logout-btn").onclick = function() {
                localStorage.removeItem("theeha-user"); currentUser = null; window.location.reload();
            };
            const authorInput = document.getElementById("input-author") || document.getElementById("blog-author") || document.getElementById("kash-author");
            if(authorInput) { authorInput.value = currentUser; authorInput.disabled = true; authorInput.style.opacity = "0.6"; }
        } else {
            container.innerHTML = `
                <div class="login-widget">
                    <input type="text" id="auth-user" placeholder="Username">
                    <input type="password" id="auth-pin" placeholder="PIN" maxlength="4">
                    <button class="btn" id="auth-login-btn" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;">Join/Go</button>
                </div>
            `;
            document.getElementById("auth-login-btn").onclick = handleIdentityGateSubmit;
        }
        syncSecurityDashboardView();
    }

    function handleIdentityGateSubmit() {
        const u = document.getElementById("auth-user").value.trim();
        const p = document.getElementById("auth-pin").value.trim();
        if(!u || p.length !== 4 || isNaN(p)) return alert("Enter valid Username and 4-Digit numeric PIN!");

        if (u === MASTER_ADMIN_USER && p === MASTER_ADMIN_PIN) {
            localStorage.setItem("theeha-user", MASTER_ADMIN_USER); currentUser = MASTER_ADMIN_USER;
            alert("Authorized Master Admin Overlord."); window.location.reload(); return;
        }

        const userRef = db.collection("users_registry").doc(u.toLowerCase());
        userRef.get().then(doc => {
            if (doc.exists) {
                if (doc.data().pin === p) { localStorage.setItem("theeha-user", u); currentUser = u; window.location.reload(); } 
                else { alert("Incorrect identity assignment PIN!"); }
            } else {
                userRef.set({ username: u, pin: p, timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
                    localStorage.setItem("theeha-user", u); currentUser = u;
                    alert(`Identity [${u}] registered successfully!`); window.location.reload();
                });
            }
        });
    }

    function syncSecurityDashboardView() {
        const authCard = document.getElementById("admin-auth-card");
        const dashboard = document.getElementById("admin-panel-dashboard");
        if(!dashboard) return;
        if (currentUser === MASTER_ADMIN_USER) { if(authCard) authCard.style.display = "none"; dashboard.style.display = "block"; } 
        else { if(authCard) authCard.style.display = "block"; dashboard.style.display = "none"; }
    }

    renderAuthWidgetState();

    // --- HOME PAGE SPEED INTEGRATION NODES ---
    const homeKalamkaari = document.getElementById("home-kalamkaari-count");
    const homeBlogs = document.getElementById("home-blogs-count");
    const homeKashmakash = document.getElementById("home-kashmakash-count");
    const trendingCardBox = document.getElementById("trending-card-box");

    if (homeKalamkaari) {
        db.collection("kalamkaari").onSnapshot(s => {
            let approvedSize = 0; let docs = [];
            s.forEach(d => { if(d.data().status === "approved") { approvedSize++; docs.push(d.data()); } });
            homeKalamkaari.textContent = approvedSize;
            if(docs.length > 0) {
                docs.sort((a,b) => (b.likes || 0) - (a.likes || 0));
                trendingCardBox.innerHTML = `<span style="font-weight:700; color:var(--text-main);">🔥 Trending Pick:</span> "${docs[0].content}" <span style="color:var(--accent-color); font-weight:600;">— ${docs[0].author} (${docs[0].likes || 0} ❤️)</span>`;
            }
        });
        db.collection("siebel").onSnapshot(s => {
            let approvedSize = 0; s.forEach(d => { if(d.data().status === "approved" || d.data().status !== "pending") approvedSize++; });
            homeBlogs.textContent = approvedSize;
        });
        db.collection("kashmakash").onSnapshot(s => {
            let approvedSize = 0; s.forEach(d => { if(d.data().status === "approved" || d.data().status !== "pending") approvedSize++; });
            homeKashmakash.textContent = approvedSize;
        });
    }

    // --- ACCORDION STUDIO ROUTERS ---
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

    // --- CAPTURING USER DISPATCH DATA PAYLOADS ---
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
                content: txt, author: currentUser || document.getElementById("input-author").value.trim() || "Anonymous",
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
            
            // Requirement 4: Save Rich Formatting Custom attributes weights/colors for Blogs
            pushContent("siebel", {
                title: title, content: txt, author: currentUser || document.getElementById("blog-author").value.trim() || "Anonymous",
                image: document.getElementById("blog-img").value.trim(),
                fontWeight: document.getElementById("blog-font-weight").value,
                textColor: document.getElementById("blog-text-color").value,
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
            pushContent("kashmakash", { content: txt, author: currentUser || document.getElementById("kash-author").value.trim() || "Anonymous", likes: 0, views: 0, comments_count: 0, shares_count: 0 }, flags.live_kashmakash);
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
            if (collection === "kalamkaari") loadKalamkaari();
            else renderStandaloneFeed(collection, collection === "siebel" ? "blogs-feed-container" : "kashmakash-feed-container");
        });
    }

    function trackCardViewLogsOnce(collection, docId) {
        const viewSessionKey = `viewed_${collection}_${docId}`;
        if (!sessionStorage.getItem(viewSessionKey)) {
            db.collection(collection).doc(docId).update({ views: firebase.firestore.FieldValue.increment(1) })
              .then(() => sessionStorage.setItem(viewSessionKey, "true")).catch(e => console.log(e));
        }
    }

    // --- 6. UNPACKING CONTENT FEEDS ENGINES ---
    const feedContainer = document.getElementById("feed-container"); 
    if(feedContainer) {
        const sortSelect = document.getElementById("sort-feed");
        const filterTag = document.getElementById("filter-tag");
        const searchInput = document.getElementById("search-input");
        let cache = [];

        function loadKalamkaari() {
            db.collection("kalamkaari").get().then(s => { 
                cache = []; s.forEach(d => { if (d.data().status === "approved") { cache.push({id: d.id, ...d.data()}); trackCardViewLogsOnce("kalamkaari", d.id); } }); 
                if (sortSelect.value === "likes") cache.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                else cache.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                applyFiltersAndRender(); 
            });
        }

        window.applyFiltersAndRender = function() {
            const tVal = filterTag.value; const sVal = searchInput.value.toLowerCase().trim();
            let filtered = cache.filter(i => (tVal === "All" || i.tag === tVal) && (!flags.search || (i.content.toLowerCase().includes(sVal) || i.author.toLowerCase().includes(sVal))));
            feedContainer.innerHTML = "";
            filtered.forEach(item => {
                const card = document.createElement("div");
                card.className = `article-card ${item.cardStyle || 'grad-default'}`;
                card.innerHTML = `
                    <div class="quote-row"><div class="article-text">"${item.content}"</div></div>
                    <div class="article-meta-row">
                        <div class="article-author">✒️ Writer: <b>${item.author}</b> &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0}</span></div>
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

        db.collection(collName).get().then(s => {
            let localCache = [];
            s.forEach(doc => { if (doc.data().status !== "pending") { localCache.push({ id: doc.id, ...doc.data() }); trackCardViewLogsOnce(collName, doc.id); } });
            localCache.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            container.innerHTML = "";
            
            localCache.forEach((item, index) => {
                const serialNumber = localCache.length - index;
                const isBlog = (collName === "siebel");
                const card = document.createElement("div");
                card.className = "article-card grad-default";
                
                let headerHTML = (isBlog && item.title) ? `
                    <div style="background: rgba(167, 139, 250, 0.12); border-left: 4px solid var(--accent-color); padding: 0.5rem 0.8rem; border-radius: 0 6px 6px 0; margin-bottom: 0.75rem; text-align: left;">
                        <div class="card-title-header" style="font-size: 1.15rem; font-weight: 700; margin: 0; line-height: 1.3;">${item.title}</div>
                    </div>` : (item.title ? `<div class="card-title-header" style="text-align: center; margin-bottom: 0.4rem;">${item.title}</div>` : '');

                // Requirement 4: Map typography weight and custom pastel hex classes dynamically onto content layouts
                const weightClass = item.fontWeight === "bold" ? "txt-weight-bold" : "";
                const colorClass = item.textColor ? `txt-color-${item.textColor}` : "txt-color-default";

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;"><span class="card-tag" style="background:var(--accent-color); font-weight:700;"># ${serialNumber}</span></div>
                    ${headerHTML}
                    <div class="quote-row">
                        <div class="article-text ${weightClass} ${colorClass}" id="text-canvas-${item.id}" style="${isBlog ? 'font-size:0.92rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;' : ''}">${item.content}</div>
                    </div>
                    ${item.image ? `<img src="${item.image}" class="blog-embedded-img" id="img-canvas-${item.id}" style="${isBlog ? 'display:none;' : ''}" onerror="this.style.display='none'">` : ''}
                    ${isBlog ? `<div style="margin-top:0.5rem; text-align: left;"><span id="trigger-btn-${item.id}" class="card-tag" style="background:var(--bg-primary); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; font-weight:600;">📖 Read Full Blog</span></div>` : ''}
                    
                    <div class="article-meta-row"><div class="article-author">✒️ Publisher: <b>${item.author}</b> &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0}</span></div></div>
                    
                    <div class="instagram-action-bar">
                        <button class="ig-btn like-btn" data-coll="${collName}" data-id="${item.id}">❤️ <span class="ig-count-label">${item.likes || 0}</span></button>
                        <button class="ig-btn comment-trigger-btn" data-id="${item.id}">💬 <span class="ig-count-label" id="comment-lbl-cnt-${item.id}">${item.comments_count || 0}</span></button>
                        <button class="ig-btn share-btn" data-coll="${collName}" data-id="${item.id}" data-text="${encodeURIComponent(item.content)}">📤 <span class="ig-count-label">${item.shares_count || 0}</span></button>
                    </div>
                    ${generateCommentsDOM(item.id, collName)}
                `;
                container.appendChild(card);
                hookCommentsListener(item.id, collName);

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

    // --- 7. ADMINISTRATION SUITE CONTROL ROOM PANEL ---
    const adminDashboardView = document.getElementById("admin-panel-dashboard");
    if (document.getElementById("admin-login-btn")) {
        document.getElementById("admin-login-btn").onclick = handleIdentityGateSubmit;
    }

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
                document.querySelectorAll(".mod-approve-btn").forEach(b => b.onclick = function() { db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).update({ status: "approved" }).then(() => { if (document.getElementById("feed-container")) loadKalamkaari(); }); });
                document.querySelectorAll(".mod-reject-btn").forEach(b => b.onclick = function() { db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete(); });
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

            let filteredActive = allActive.filter(item => {
                return searchVal === "" || (item.author && item.author.toLowerCase().includes(searchVal)) || (item.title && item.title.toLowerCase().includes(searchVal)) || (item.content && item.content.toLowerCase().includes(searchVal));
            });

            liveContainer.innerHTML = "";
            if (filteredActive.length === 0) { liveContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">No matching articles found.</p>`; return; }

            filteredActive.forEach(item => {
                let dateStr = "Date Unknown"; if(item.timestamp && item.timestamp.seconds) { const d = new Date(item.timestamp.seconds * 1000); dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); }
                const row = document.createElement("div"); row.className = "mod-item-card"; row.style.padding = "0.4rem 0.6rem";
                row.innerHTML = `
                    <div style="flex:1; padding-right:0.5rem; overflow:hidden;"><div style="font-size:0.8rem; font-weight:700; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;"><span style="color:var(--accent-color); font-size:0.7rem;">[${item.collectionName.toUpperCase()}]</span> ${item.title || item.content.substring(0, 20)}...</div><div style="font-size:0.7rem; opacity:0.6; margin-top:0.1rem;">By: ${item.author} | 📅 ${dateStr}</div></div>
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

            document.querySelectorAll(".admin-delete-btn").forEach(btn => {
                btn.onclick = function() { if (confirm(`Permanently delete from ${this.getAttribute("data-coll").toUpperCase()}?`)) db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete(); };
            });
        }

        document.querySelectorAll("#edit-canvas-group .grad-dot").forEach(d => d.onclick = function() { document.querySelectorAll("#edit-canvas-group .grad-dot").forEach(x => x.classList.remove("active")); this.classList.add("active"); });
        document.getElementById("edit-cancel-btn").onclick = () => document.getElementById("admin-modal-editor").style.display = "none";
        document.getElementById("edit-save-btn").onclick = function() {
            const id = document.getElementById("edit-doc-id").value; const c = document.getElementById("edit-doc-coll").value;
            let updatePayload = { author: document.getElementById("edit-author-input").value.trim(), content: document.getElementById("edit-content-input").value.trim() };
            if(c === "siebel") updatePayload.title = document.getElementById("edit-title-input").value.trim();
            if(c === "kalamkaari") { const activeDot = document.querySelector("#edit-canvas-group .grad-dot.active"); if(activeDot) updatePayload.cardStyle = activeDot.getAttribute("data-style"); }
            
            db.collection(c).doc(id).update(updatePayload).then(() => { alert("Updated successfully!"); document.getElementById("admin-modal-editor").style.display = "none"; if(c === "kalamkaari" && document.getElementById("feed-container")) loadKalamkaari(); });
        };

        collections.forEach(coll => { db.collection(coll).where("status", "==", "approved").onSnapshot(s => { activeMap[coll] = []; s.forEach(doc => activeMap[coll].push({ id: doc.id, collectionName: coll, ...doc.data() })); renderDeleteQueue(); }); });
    }

    // --- REUSABLE HELPER ATTACHMENTS COMPONENTS ---
    function generateCommentsDOM(id, coll) {
        return `<div class="comments-section" id="comments-box-node-${id}"><div class="comment-input-block"><input type="text" placeholder="Add comment..." class="c-input"><button class="btn c-send-btn" data-coll="${coll}" data-id="${id}" style="padding:0.2rem 0.6rem; font-size:0.75rem;">Add</button></div><ul class="comment-list" id="comments-list-${id}"></ul></div>`;
    }

    function attachActionListeners() {
        document.querySelectorAll(".comment-trigger-btn").forEach(btn => {
            btn.onclick = function() {
                if(!currentUser && !flags.guest_comment) return alert("Interaction Blocked: Please log in first!");
                const id = this.getAttribute("data-id"); const targetBox = document.getElementById(`comments-box-node-${id}`);
                targetBox.style.display = (targetBox.style.display === "block") ? "none" : "block";
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
                
                // Requirement 5: Explicitly bind comment submission identities सामने matching brackets format text
                const authorSignature = currentUser ? `[👤 ${currentUser}]` : `[👤 Guest]`;
                const finalCommentString = `${authorSignature} ${input.value.trim()}`;
                
                db.collection(coll).doc(id).collection("comments").add({ text: finalCommentString, timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
                    db.collection(coll).doc(id).update({ comments_count: firebase.firestore.FieldValue.increment(1) }).then(() => {
                        input.value = ""; if(coll === "kalamkaari" && typeof loadKalamkaari === "function") loadKalamkaari();
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

    if (document.getElementById("feed-container")) loadKalamkaari();
    if (document.getElementById("blogs-feed-container")) renderStandaloneFeed("siebel", "blogs-feed-container");
    if (document.getElementById("kashmakash-feed-container")) renderStandaloneFeed("kashmakash", "kashmakash-feed-container");
});