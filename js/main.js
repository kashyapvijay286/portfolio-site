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
const ADMIN_SECURE_TOKEN = "TheehaAdmin2026";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. LIGHT/DARK IMPLEMENTATION ---
    const themeToggleBtn = document.querySelectorAll("#theme-toggle");
    const activeTheme = localStorage.getItem("theeha-theme") || "dark";
    document.documentElement.setAttribute("data-theme", activeTheme);
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

    // Default configuration metrics matrix
    let flags = { comments: true, sharing: true, canvas: true, search: true, live_kalamkaari: true, live_siebel: true, live_kashmakash: true };

    db.collection("system_flags").doc("config").onSnapshot((doc) => {
        if (doc.exists) {
            flags = doc.data();
            const canvasBlock = document.getElementById("admin-flag-canvas");
            const searchBlock = document.getElementById("admin-flag-search");
            if (canvasBlock) canvasBlock.style.display = flags.canvas ? "flex" : "none";
            if (searchBlock) searchBlock.style.display = flags.search ? "block" : "none";
            
            // Re-render open panels seamlessly
            if (document.getElementById("feed-container")) applyFiltersAndRender();
            if (document.getElementById("blogs-feed-container")) renderStandaloneFeed("siebel", "blogs-feed-container");
            if (document.getElementById("kashmakash-feed-container")) renderStandaloneFeed("kashmakash", "kashmakash-feed-container");
        }
    });

    // --- 2. HOME PAGE REALTIME MATRIX HUB ---
    const homeKalamkaari = document.getElementById("home-kalamkaari-count");
    const homeBlogs = document.getElementById("home-blogs-count");
    const homeKashmakash = document.getElementById("home-kashmakash-count");
    const trendingCardBox = document.getElementById("trending-card-box");

    if (homeKalamkaari) {
        db.collection("kalamkaari").where("status", "==", "approved").onSnapshot(s => {
            homeKalamkaari.textContent = s.size;
            if(!s.empty) {
                let docs = [];
                s.forEach(d => docs.push(d.data()));
                docs.sort((a,b) => (b.likes || 0) - (a.likes || 0));
                // Requirement 3: Trending Pick with real-time Like count
                trendingCardBox.innerHTML = `<span style="font-weight:700; color:var(--text-main);">🔥 Trending Pick:</span> "${docs[0].content}" <span style="color:var(--accent-color); font-weight:600;">— ${docs[0].author} (${docs[0].likes || 0} ❤️)</span>`;
            }
        });
        db.collection("siebel").where("status", "==", "approved").onSnapshot(s => homeBlogs.textContent = s.size);
        db.collection("kashmakash").where("status", "==", "approved").onSnapshot(s => homeKashmakash.textContent = s.size);
    }

    // --- 3. ACCORDION STUDIO DRAWER INTERFACES ---
    const toggleFormBtn = document.getElementById("toggle-form-btn");
    if (toggleFormBtn) {
        const target = toggleFormBtn.getAttribute("data-target");
        const targetForm = document.getElementById(`compose-form-${target}`);
        toggleFormBtn.onclick = function() {
            targetForm.classList.toggle("open");
            toggleFormBtn.textContent = targetForm.classList.contains("open") ? "➖ Close Studio" : `➕ Write a Piece`;
        };
    }

    // --- 4. USER FORM ACTIONS INJECTION CAPTURE ROUTINES ---
    const submitBtn = document.getElementById("submit-btn"); // Kalamkaari Page
    const blogSubmitBtn = document.getElementById("blog-submit-btn"); // Blogs Page
    const kashSubmitBtn = document.getElementById("kash-submit-btn"); // Kashmakash Page

    if(submitBtn) {
        let selectedStyle = "grad-default";
        document.querySelectorAll(".grad-dot").forEach(d => d.onclick = function() {
            document.querySelectorAll(".grad-dot").forEach(x => x.classList.remove("active"));
            this.classList.add("active"); selectedStyle = this.getAttribute("data-style");
        });
        submitBtn.onclick = function() {
            const txt = document.getElementById("input-content").value.trim();
            if(!txt) return;
            pushContent("kalamkaari", {
                content: txt, author: document.getElementById("input-author").value.trim() || "Anonymous",
                tag: document.getElementById("input-tag").value, cardStyle: flags.canvas ? selectedStyle : "grad-default", likes: 0
            }, flags.live_kalamkaari);
            document.getElementById("input-content").value = ""; document.getElementById("input-author").value = "";
            document.getElementById(`compose-form-kalamkaari`).classList.remove("open");
            toggleFormBtn.textContent = "➕ Write a Piece";
        };
    }

    if(blogSubmitBtn) {
        blogSubmitBtn.onclick = function() {
            const txt = document.getElementById("blog-content").value.trim();
            const title = document.getElementById("blog-title").value.trim();
            if(!txt || !title) return alert("Title and Content are required!");
            pushContent("siebel", {
                title: title, content: txt, author: document.getElementById("blog-author").value.trim() || "Anonymous",
                image: document.getElementById("blog-img").value.trim(), likes: 0
            }, flags.live_siebel);
            ["blog-content", "blog-title", "blog-author", "blog-img"].forEach(id => document.getElementById(id).value = "");
            document.getElementById(`compose-form-siebel`).classList.remove("open");
            toggleFormBtn.textContent = "➕ Write a Blog";
        };
    }

    if(kashSubmitBtn) {
        kashSubmitBtn.onclick = function() {
            const txt = document.getElementById("kash-content").value.trim();
            if(!txt) return alert("Content is required!");
            pushContent("kashmakash", { content: txt, author: document.getElementById("kash-author").value.trim() || "Anonymous", likes: 0 }, flags.live_kashmakash);
            document.getElementById("kash-content").value = ""; document.getElementById("kash-author").value = "";
            document.getElementById(`compose-form-kashmakash`).classList.remove("open");
            toggleFormBtn.textContent = "➕ Write a Thought";
        };
    }

    function pushContent(collection, payload, isLiveDirectly) {
        payload.status = isLiveDirectly ? "approved" : "pending";
        payload.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        db.collection(collection).add(payload).then(() => {
            alert(isLiveDirectly ? "Published successfully!" : "Submitted successfully! Awaiting admin verification approval.");
        });
    }

    // --- 5. DATA FEED DISPLAY ENGINES (WITH LINE SPACES & IMAGES PRESERVATION) ---
    const feedContainer = document.getElementById("feed-container"); // Kalamkaari
    if(feedContainer) {
        const sortSelect = document.getElementById("sort-feed");
        const filterTag = document.getElementById("filter-tag");
        const searchInput = document.getElementById("search-input");
        let cache = [];

      function loadKalamkaari() {
            const sortBy = sortSelect.value;
            
            // HACK: Humne saari direct queries (.where aur .orderBy) hata di hain.
            // Ab Firebase ko bina kisi condition ke poora data fetch karne do.
            // Isse Firebase kabhi bhi indexing error nahi dega.
            db.collection("kalamkaari").onSnapshot(s => { 
                cache = []; 
                s.forEach(d => {
                    const item = d.data();
                    // Filters hum front-end par JavaScript se lagayenge
                    if (item.status === "approved") {
                        cache.push({id: d.id, ...item});
                    }
                }); 

                // Front-end Sorting Engine
                if (sortBy === "likes") {
                    cache.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                } else {
                    // Timestamps ko secure tarike se compare karke most recent ko upar rakhein
                    cache.sort((a, b) => {
                        const timeA = a.timestamp ? (a.timestamp.seconds || new Date(a.timestamp).getTime() / 1000) : 0;
                        const timeB = b.timestamp ? (b.timestamp.seconds || new Date(b.timestamp).getTime() / 1000) : 0;
                        return timeB - timeA;
                    });
                }

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
                    <div class="quote-row">
                        <div class="article-text">"${item.content}"</div>
                        <div class="action-buttons">
                            <button class="like-btn" data-coll="kalamkaari" data-id="${item.id}">❤️ <span class="count">${item.likes || 0}</span></button>
                            ${flags.sharing ? `<button class="share-btn" data-text="${encodeURIComponent(item.content)}">📤 Share</button>` : ''}
                        </div>
                    </div>
                    <div class="article-meta-row"><div class="article-author">— ${item.author}</div><span class="card-tag">${item.tag || 'General'}</span></div>
                    ${flags.comments ? generateCommentsDOM(item.id, "kalamkaari") : ''}
                `;
                feedContainer.appendChild(card);
                if(flags.comments) hookCommentsListener(item.id, "kalamkaari");
            });
            attachActionListeners();
        };
        [sortSelect, filterTag].forEach(el => el.onchange = loadKalamkaari);
        searchInput.oninput = applyFiltersAndRender;
        loadKalamkaari();
    }

    // STANDALONE PAGES DELIVERY MECHANISM (SIEBEL & KASHMAKASH)
    function renderStandaloneFeed(collName, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;

        // Direct .where() aur .orderBy() queries hata di hain taaki Firebase block na kare
        db.collection(collName).onSnapshot(s => {
            let localCache = [];
            
            s.forEach(doc => {
                const item = doc.data();
                // Front-end filtering logic: Sirf unhe lo jo pending nahi hain (approved ya old data)
                if (item.status !== "pending") {
                    localCache.push({ id: doc.id, ...item });
                }
            });

            // Chronological Sorting Engine (Newest posts on top)
            localCache.sort((a, b) => {
                const timeA = a.timestamp ? (a.timestamp.seconds || new Date(a.timestamp).getTime() / 1000) : 0;
                const timeB = b.timestamp ? (b.timestamp.seconds || new Date(b.timestamp).getTime() / 1000) : 0;
                return timeB - timeA;
            });

            container.innerHTML = "";
            
            if(localCache.length === 0) {
                container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:2rem;">No published content found here yet.</p>`;
                return;
            }

            localCache.forEach(item => {
                const card = document.createElement("div");
                card.className = "article-card grad-default";
                card.innerHTML = `
                    ${item.title ? `<div class="card-title-header">${item.title}</div>` : ''}
                    <div class="quote-row">
                        <div class="article-text">${item.content}</div>
                        <div class="action-buttons">
                            <button class="like-btn" data-coll="${collName}" data-id="${item.id}">❤️ <span class="count">${item.likes || 0}</span></button>
                        </div>
                    </div>
                    ${item.image ? `<img src="${item.image}" class="blog-embedded-img" onerror="this.style.display='none'">` : ''}
                    <div class="article-meta-row"><div class="article-author">— ${item.author}</div></div>
                    ${flags.comments ? generateCommentsDOM(item.id, collName) : ''}
                `;
                container.appendChild(card);
                if(flags.comments) hookCommentsListener(item.id, collName);
            });
            attachActionListeners();
        });
    }

    // --- 6. ADMINISTRATIVE SUITE CONTROL PANEL ENGINE ---
    const adminPassInput = document.getElementById("admin-pass-input");
    const adminLoginBtn = document.getElementById("admin-login-btn");
    const adminDashboardView = document.getElementById("admin-panel-dashboard");
    const adminTargetSelect = document.getElementById("admin-target-page");

    if (adminLoginBtn) {
        // Toggle dynamic workspace attributes on value transformations
        adminTargetSelect.onchange = function() {
            const v = this.value;
            document.getElementById("admin-title-group").style.display = (v === "siebel") ? "flex" : "none";
            document.getElementById("admin-image-group").style.display = (v === "siebel") ? "flex" : "none";
        };
        adminTargetSelect.onchange();

        adminLoginBtn.onclick = function() {
            if (adminPassInput.value === ADMIN_SECURE_TOKEN) {
                document.getElementById("admin-auth-card").style.display = "none";
                adminDashboardView.style.display = "block";
                
                // Mount reactive checkbox control sliders
                const ck=document.getElementById("live-kalamkaari"), cs=document.getElementById("live-siebel"), cx=document.getElementById("live-kashmakash"),
                      fcom=document.getElementById("flag-comments"), fshr=document.getElementById("flag-sharing"), fcan=document.getElementById("flag-canvas"), fsch=document.getElementById("flag-search");

                ck.checked = flags.live_kalamkaari; cs.checked = flags.live_siebel; cx.checked = flags.live_kashmakash;
                fcom.checked = flags.comments; fshr.checked = flags.sharing; fcan.checked = flags.canvas; fsch.checked = flags.search;

                const saveAdminFlags = () => {
                    db.collection("system_flags").doc("config").set({
                        live_kalamkaari: ck.checked, live_siebel: cs.checked, live_kashmakash: cx.checked,
                        comments: fcom.checked, sharing: fshr.checked, canvas: fcan.checked, search: fsch.checked
                    });
                };
                [ck, cs, cx, fcom, fshr, fcan, fsch].forEach(box => box.onchange = saveAdminFlags);

                // Admin direct publisher processing rule core
                document.getElementById("admin-publish-btn").onclick = function() {
                    const page = adminTargetSelect.value;
                    const txt = document.getElementById("admin-content-input").value.trim();
                    if(!txt) return;
                    let payload = { content: txt, author: document.getElementById("admin-author-input").value.trim() || "Vijay Kashyap", likes: 0, status: "approved", timestamp: firebase.firestore.FieldValue.serverTimestamp() };
                    if(page === "siebel") { payload.title = document.getElementById("admin-title-input").value.trim() || "Untitled Blog"; payload.image = document.getElementById("admin-image-input").value.trim(); }
                    if(page === "kalamkaari") { payload.tag = "General"; payload.cardStyle = "grad-default"; }
                    
                    db.collection(page).add(payload).then(() => {
                        alert("Published to live instantly by Admin!");
                        ["admin-content-input", "admin-author-input", "admin-title-input", "admin-image-input"].forEach(id => document.getElementById(id).value = "");
                    });
                };

                listenToModerationQueues();
            } else { alert("Invalid Security Access Key Token!"); }
        };
    }

    // --- 7. VERIFICATION QUEUE SYSTEM (CROSS-COLLECTION MERGE MONITOR) ---
    function listenToModerationQueues() {
        const queueListContainer = document.getElementById("admin-queue-list");
        const queueCountSpan = document.getElementById("mod-queue-count");

        const collections = ["kalamkaari", "siebel", "kashmakash"];
        let pendingMap = {};

        collections.forEach(coll => {
            db.collection(coll).where("status", "==", "pending").onSnapshot(s => {
                pendingMap[coll] = [];
                s.forEach(doc => pendingMap[coll].push({ id: doc.id, collectionName: coll, ...doc.data() }));
                
                // Flatten structural map array rules
                let allPending = [];
                collections.forEach(c => allPending = allPending.concat(pendingMap[c] || []));
                
                queueCountSpan.textContent = allPending.length;
                queueListContainer.innerHTML = "";

                if(allPending.length === 0) {
                    queueListContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1rem;">Queue is clean. No pending approvals found.</p>`;
                    return;
                }

                allPending.forEach(item => {
                    const row = document.createElement("div");
                    row.className = "mod-item-card";
                    row.innerHTML = `
                        <div style="flex:1; padding-right:1rem;">
                            <span class="card-tag" style="background:var(--accent-color); margin-bottom:0.25rem; display:inline-block;">${item.collectionName.toUpperCase()}</span>
                            <div style="font-size:0.9rem; font-weight:700;">${item.title || 'No Title'} <span style="font-weight:500; opacity:0.6; font-size:0.8rem;">by ${item.author}</span></div>
                            <p style="font-size:0.8rem; opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${item.content}</p>
                        </div>
                        <div class="action-buttons">
                            <button class="btn mod-approve-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Approve</button>
                            <button class="btn btn-danger mod-reject-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Reject</button>
                        </div>
                    `;
                    queueListContainer.appendChild(row);
                });

                // Attach approval queue event bindings
                document.querySelectorAll(".mod-approve-btn").forEach(b => b.onclick = function() {
                    db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).update({ status: "approved" });
                });
                document.querySelectorAll(".mod-reject-btn").forEach(b => b.onclick = function() {
                    db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete();
                });
            });
        });
    }

    // --- REUSABLE UTILITY HELPER HOOKS ---
    function generateCommentsDOM(id, coll) {
        return `<div class="comments-section"><div class="comment-input-block"><input type="text" placeholder="Add comment..." class="c-input"><button class="btn c-send-btn" data-coll="${coll}" data-id="${id}" style="padding:0.2rem 0.6rem; font-size:0.75rem;">Add</button></div><ul class="comment-list" id="comments-list-${id}"></ul></div>`;
    }

    function attachActionListeners() {
        document.querySelectorAll(".like-btn").forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute("data-id"); const coll = this.getAttribute("data-coll");
                const ref = db.collection(coll).doc(id); const liked = this.classList.contains("liked");
                ref.update({ likes: firebase.firestore.FieldValue.increment(liked ? -1 : 1) });
                if(liked) { this.classList.remove("liked"); localStorage.removeItem(`liked_${id}`); }
                else { this.classList.add("liked"); localStorage.setItem(`liked_${id}`, "true"); }
            };
        });
        document.querySelectorAll(".share-btn").forEach(btn => {
            btn.onclick = function() { window.open(`https://api.whatsapp.com/send?text=*Theeha Piece:* "${this.getAttribute("data-text")}" %0A%0A Explore: ${window.location.href}`, "_blank"); };
        });
        document.querySelectorAll(".c-send-btn").forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute("data-id"); const coll = this.getAttribute("data-coll");
                const input = this.parentElement.querySelector(".c-input"); if(!input.value.trim()) return;
                db.collection(coll).doc(id).collection("comments").add({ text: input.value.trim(), timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(() => input.value = "");
            };
        });
    }

    function hookCommentsListener(id, coll) {
        const list = document.getElementById(`comments-list-${id}`);
        db.collection(coll).doc(id).collection("comments").orderBy("timestamp", "asc").onSnapshot(s => {
            if(!list) return; list.innerHTML = "";
            s.forEach(d => { const li = document.createElement("li"); li.className = "comment-item"; li.textContent = d.data().text; list.appendChild(li); });
        });
    }
});