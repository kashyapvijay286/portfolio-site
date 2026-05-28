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
    
    // --- 1. LIGHT/DARK THEME ENGINE ---
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

    let flags = { comments: true, sharing: true, canvas: true, search: true, live_kalamkaari: true, live_siebel: true, live_kashmakash: true };

    db.collection("system_flags").doc("config").onSnapshot((doc) => {
        if (doc.exists) {
            flags = doc.data();
            const canvasBlock = document.getElementById("admin-flag-canvas");
            const searchBlock = document.getElementById("admin-flag-search");
            if (canvasBlock) canvasBlock.style.display = flags.canvas ? "flex" : "none";
            if (searchBlock) searchBlock.style.display = flags.search ? "block" : "none";
            
            if (document.getElementById("feed-container")) loadKalamkaari();
            if (document.getElementById("blogs-feed-container")) renderStandaloneFeed("siebel", "blogs-feed-container");
            if (document.getElementById("kashmakash-feed-container")) renderStandaloneFeed("kashmakash", "kashmakash-feed-container");
        }
    });

    // --- 2. HOME PAGE STATS COUNTERS ---
    const homeKalamkaari = document.getElementById("home-kalamkaari-count");
    const homeBlogs = document.getElementById("home-blogs-count");
    const homeKashmakash = document.getElementById("home-kashmakash-count");
    const trendingCardBox = document.getElementById("trending-card-box");

    if (homeKalamkaari) {
        db.collection("kalamkaari").onSnapshot(s => {
            let approvedSize = 0; let docs = [];
            s.forEach(d => {
                if(d.data().status === "approved") { approvedSize++; docs.push(d.data()); }
            });
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

    // --- 3. ACCORDION STUDIO DRAWER INTERFACES ---
    const toggleFormBtn = document.getElementById("toggle-form-btn");
    if (toggleFormBtn) {
        const target = toggleFormBtn.getAttribute("data-target");
        const targetForm = document.getElementById(`compose-form-${target}`);
        
        if(targetForm) targetForm.style.setProperty("display", "none", "important");

        toggleFormBtn.onclick = function() {
            if (targetForm.style.getPropertyValue("display") === "none") {
                targetForm.style.setProperty("display", "flex", "important");
                toggleFormBtn.textContent = "➖ Close Studio";
            } else {
                targetForm.style.setProperty("display", "none", "important");
                toggleFormBtn.textContent = target === "siebel" ? "➕ Write a Blog" : (target === "kashmakash" ? "➕ Write a Thought" : "➕ Write a Piece");
            }
        };
    }

    // --- 4. USER FORM ACTIONS INJECTIONS ---
    const submitBtn = document.getElementById("submit-btn"); 
    const blogSubmitBtn = document.getElementById("blog-submit-btn"); 
    const kashSubmitBtn = document.getElementById("kash-submit-btn"); 

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
                tag: document.getElementById("input-tag").value, cardStyle: flags.canvas ? selectedStyle : "grad-default", likes: 0, views: 0
            }, flags.live_kalamkaari);
            document.getElementById("input-content").value = ""; document.getElementById("input-author").value = "";
            document.getElementById(`compose-form-kalamkaari`).style.setProperty("display", "none", "important");
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
                image: document.getElementById("blog-img").value.trim(), likes: 0, views: 0
            }, flags.live_siebel);
            ["blog-content", "blog-title", "blog-author", "blog-img"].forEach(id => document.getElementById(id).value = "");
            document.getElementById(`compose-form-siebel`).style.setProperty("display", "none", "important");
            toggleFormBtn.textContent = "➕ Write a Blog";
        };
    }

    if(kashSubmitBtn) {
        kashSubmitBtn.onclick = function() {
            const txt = document.getElementById("kash-content").value.trim();
            if(!txt) return alert("Content is required!");
            pushContent("kashmakash", { content: txt, author: document.getElementById("kash-author").value.trim() || "Anonymous", likes: 0, views: 0 }, flags.live_kashmakash);
            document.getElementById("kash-content").value = ""; document.getElementById("kash-author").value = "";
            document.getElementById(`compose-form-kashmakash`).style.setProperty("display", "none", "important");
            toggleFormBtn.textContent = "➕ Write a Thought";
        };
    }

    function pushContent(collection, payload, isLiveDirectly) {
        payload.status = isLiveDirectly ? "approved" : "pending";
        payload.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        db.collection(collection).add(payload).then(() => {
            alert(isLiveDirectly ? "Published successfully!" : "Submitted successfully! Awaiting admin verification approval.");
            if (collection === "kalamkaari") loadKalamkaari();
            else renderStandaloneFeed(collection, collection === "siebel" ? "blogs-feed-container" : "kashmakash-feed-container");
        });
    }

    // --- 5. LOOP-SAFE UNIQUE VIEW TRACKER ---
    function trackCardViewLogsOnce(collection, docId) {
        const viewSessionKey = `viewed_${collection}_${docId}`;
        if (!sessionStorage.getItem(viewSessionKey)) {
            db.collection(collection).doc(docId).update({
                views: firebase.firestore.FieldValue.increment(1)
            }).then(() => {
                sessionStorage.setItem(viewSessionKey, "true");
            }).catch(e => console.log("Views initiation skipped:", e));
        }
    }

    // --- 6. DATA FEEDS DELIVERY CONSOLE MODULES ---
    const feedContainer = document.getElementById("feed-container"); 
    if(feedContainer) {
        const sortSelect = document.getElementById("sort-feed");
        const filterTag = document.getElementById("filter-tag");
        const searchInput = document.getElementById("search-input");
        let cache = [];

        function loadKalamkaari() {
            db.collection("kalamkaari").get().then(s => { 
                cache = []; 
                s.forEach(d => {
                    const item = d.data();
                    if (item.status === "approved") {
                        cache.push({id: d.id, ...item});
                        trackCardViewLogsOnce("kalamkaari", d.id);
                    }
                }); 

                if (sortSelect.value === "likes") {
                    cache.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                } else {
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
                    <div class="article-meta-row">
                        <div class="article-author">— ${item.author} &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0} views</span></div>
                        <span class="card-tag">${item.tag || 'General'}</span>
                    </div>
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

    function renderStandaloneFeed(collName, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;

        db.collection(collName).get().then(s => {
            let localCache = [];
            s.forEach(doc => {
                const item = doc.data();
                if (item.status !== "pending") {
                    localCache.push({ id: doc.id, ...item });
                    trackCardViewLogsOnce(collName, doc.id);
                }
            });

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

            localCache.forEach((item, index) => {
                const serialNumber = localCache.length - index;
                const isBlog = (collName === "siebel");
                const card = document.createElement("div");
                card.className = "article-card grad-default";
                
                // CONDITIONAL RULE: Layout optimization shifting heading left-side with premium Pastel Highlight Background for Siebel Blogs
                let headerHTML = '';
                if(isBlog && item.title) {
                    headerHTML = `
                        <div style="background: rgba(167, 139, 250, 0.15); border-left: 4px solid var(--accent-color); padding: 0.5rem 0.8rem; border-radius: 0 6px 6px 0; margin-bottom: 0.75rem; text-align: left;">
                            <div class="card-title-header" style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 0; line-height: 1.3;">${item.title}</div>
                        </div>
                    `;
                } else if(item.title) {
                    headerHTML = `<div class="card-title-header" style="text-align: center; margin-bottom: 0.4rem;">${item.title}</div>`;
                }

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span class="card-tag" style="background:var(--accent-color); font-weight:700;"># ${serialNumber}</span>
                    </div>
                    ${headerHTML}
                    <div class="quote-row" style="margin-top: 0.4rem;">
                        <div class="article-text" id="text-canvas-${item.id}" style="${isBlog ? 'font-size:0.92rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;' : ''}">${item.content}</div>
                        <div class="action-buttons"><button class="like-btn" data-coll="${collName}" data-id="${item.id}">❤️ <span class="count">${item.likes || 0}</span></button></div>
                    </div>
                    ${item.image ? `<img src="${item.image}" class="blog-embedded-img" id="img-canvas-${item.id}" style="${isBlog ? 'display:none;' : ''}" onerror="this.style.display='none'">` : ''}
                    
                    ${isBlog ? `<div style="margin-top:0.5rem; text-align: left;"><span id="trigger-btn-${item.id}" class="card-tag" style="background:var(--bg-primary); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; font-weight:600;">📖 Read Full Blog</span></div>` : ''}
                    
                    <div class="article-meta-row">
                        <div class="article-author">— ${item.author} &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0} views</span></div>
                    </div>
                    ${flags.comments ? generateCommentsDOM(item.id, collName) : ''}
                `;
                container.appendChild(card);
                if(flags.comments) hookCommentsListener(item.id, collName);

                if(isBlog) {
                    const trig = document.getElementById(`trigger-btn-${item.id}`);
                    const textCanvas = document.getElementById(`text-canvas-${item.id}`);
                    const imgCanvas = document.getElementById(`img-canvas-${item.id}`);
                    
                    trig.onclick = function() {
                        if(textCanvas.style.display === "-webkit-box") {
                            textCanvas.style.display = "block";
                            textCanvas.style.webkitLineClamp = "unset";
                            if(imgCanvas) imgCanvas.style.display = "block";
                            trig.textContent = "❌ Read Less";
                        } else {
                            textCanvas.style.display = "-webkit-box";
                            textCanvas.style.webkitLineClamp = "3";
                            if(imgCanvas) imgCanvas.style.display = "none";
                            trig.textContent = "📖 Read Full Blog";
                        }
                    };
                }
            });
            attachActionListeners();
        });
    }

    // --- 7. ADMINISTRATIVE SUITE PANEL ENGINE ---
    const adminPassInput = document.getElementById("admin-pass-input");
    const adminLoginBtn = document.getElementById("admin-login-btn");
    const adminDashboardView = document.getElementById("admin-panel-dashboard");

    if (adminLoginBtn) {
        adminLoginBtn.onclick = function() {
            if (adminPassInput.value === ADMIN_SECURE_TOKEN) {
                document.getElementById("admin-auth-card").style.display = "none";
                adminDashboardView.style.display = "block";
                
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

                listenToModerationQueues();
                listenToLiveArticlesForDeletion();
            } else { alert("Invalid Security Key!"); }
        };
    }

    // --- 8. VERIFICATION QUEUE SYSTEM ---
    function listenToModerationQueues() {
        const queueListContainer = document.getElementById("admin-queue-list");
        const queueCountSpan = document.getElementById("mod-queue-count");
        const collections = ["kalamkaari", "siebel", "kashmakash"];
        let pendingMap = {};

        collections.forEach(coll => {
            db.collection(coll).where("status", "==", "pending").onSnapshot(s => {
                pendingMap[coll] = [];
                s.forEach(doc => pendingMap[coll].push({ id: doc.id, collectionName: coll, ...doc.data() }));
                
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

                document.querySelectorAll(".mod-approve-btn").forEach(b => b.onclick = function() {
                    db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).update({ status: "approved" }).then(() => {
                        if (document.getElementById("feed-container")) loadKalamkaari();
                    });
                });
                document.querySelectorAll(".mod-reject-btn").forEach(b => b.onclick = function() {
                    db.collection(this.getAttribute("data-coll")).doc(this.getAttribute("data-id")).delete();
                });
            });
        });
    }

    // --- 9. LIVE ARTICLES DELETION ENGINE WITH CHANNELS FILTER MATRIX ---
    function listenToLiveArticlesForDeletion() {
        const liveContainer = document.getElementById("admin-live-articles-list");
        const collections = ["kalamkaari", "siebel", "kashmakash"];
        let activeMap = {};

        // Injects dynamic filter dropdown substrate matrix if missing in DOM
        if(!document.getElementById("admin-delete-filter-selector")) {
            const filterWrapper = document.createElement("div");
            filterWrapper.style.marginbottom = "0.6rem";
            filterWrapper.innerHTML = `
                <select id="admin-delete-filter-selector" class="sort-select" style="width:100%; font-size:0.8rem; padding:0.3rem;">
                    <option value="ALL">🔍 Show All Categories</option>
                    <option value="KALAMKAARI">Kalamkaari Pieces Only</option>
                    <option value="SIEBEL">Siebel Blogs Only</option>
                    <option value="KASHMAKASH">Kashmakash Thoughts Only</option>
                </select>
            `;
            liveContainer.parentNode.insertBefore(filterWrapper, liveContainer);
            document.getElementById("admin-delete-filter-selector").onchange = () => syncAndRenderDeleteQueue();
        }

        function syncAndRenderDeleteQueue() {
            const currentFilter = document.getElementById("admin-delete-filter-selector").value;
            let allActive = [];
            
            collections.forEach(c => {
                if(currentFilter === "ALL" || currentFilter === c.toUpperCase()) {
                    allActive = allActive.concat(activeMap[c] || []);
                }
            });

            liveContainer.innerHTML = "";
            if (allActive.length === 0) {
                liveContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">No matching active posts found.</p>`;
                return;
            }

            allActive.forEach(item => {
                const row = document.createElement("div");
                row.className = "mod-item-card";
                row.style.padding = "0.4rem 0.6rem";
                row.innerHTML = `
                    <div style="flex:1; padding-right:0.5rem; overflow:hidden;">
                        <div style="font-size:0.8rem; font-weight:700; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                            <span style="color:var(--accent-color); font-size:0.7rem;">[${item.collectionName.toUpperCase()}]</span> 
                            ${item.title || item.content.substring(0, 25)}...
                        </div>
                    </div>
                    <button class="btn btn-danger admin-delete-btn" data-coll="${item.collectionName}" data-id="${item.id}" style="padding:0.2rem 0.4rem; font-size:0.7rem;">🗑️ Delete</button>
                `;
                liveContainer.appendChild(row);
            });

            document.querySelectorAll(".admin-delete-btn").forEach(btn => {
                btn.onclick = function() {
                    const targetColl = this.getAttribute("data-coll");
                    const targetId = this.getAttribute("data-id");
                    if (confirm(`Are you absolutely sure you want to permanently delete this item from ${targetColl.toUpperCase()}?`)) {
                        db.collection(targetColl).doc(targetId).delete().then(() => {
                            alert("Item permanently removed from Database!");
                        });
                    }
                };
            });
        }

        collections.forEach(coll => {
            db.collection(coll).where("status", "==", "approved").onSnapshot(s => {
                activeMap[coll] = [];
                s.forEach(doc => activeMap[coll].push({ id: doc.id, collectionName: coll, ...doc.data() }));
                syncAndRenderDeleteQueue();
            });
        });
    }

    // --- REUSABLE UTILITY HELPER FUNCTIONS ---
    function generateCommentsDOM(id, coll) {
        return `<div class="comments-section"><div class="comment-input-block"><input type="text" placeholder="Add comment..." class="c-input"><button class="btn c-send-btn" data-coll="${coll}" data-id="${id}" style="padding:0.2rem 0.6rem; font-size:0.75rem;">Add</button></div><ul class="comment-list" id="comments-list-${id}"></ul></div>`;
    }

    // Attach Action click triggers safely
    function attachActionListeners() {
        document.querySelectorAll(".like-btn").forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute("data-id"); const coll = this.getAttribute("data-coll");
                const ref = db.collection(coll).doc(id); const liked = this.classList.contains("liked");
                ref.update({ likes: firebase.firestore.FieldValue.increment(liked ? -1 : 1) }).then(() => {
                    if(coll === "kalamkaari") loadKalamkaari();
                });
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

    if (document.getElementById("feed-container")) loadKalamkaari();
    if (document.getElementById("blogs-feed-container")) renderStandaloneFeed("siebel", "blogs-feed-container");
    if (document.getElementById("kashmakash-feed-container")) renderStandaloneFeed("kashmakash", "kashmakash-feed-container");
});