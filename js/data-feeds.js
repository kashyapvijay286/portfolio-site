// ==========================================
// 4. CONTENT SUBMISSIONS & FEEDS (WITH REALTIME NOTIFICATIONS)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // Stats Counters (Home Page)
    if (document.getElementById("home-kalamkaari-count")) {
        db.collection("kalamkaari").onSnapshot(s => {
            let approvedSize = 0; let docs = [];
            s.forEach(d => { if(d.data().status !== "pending") { approvedSize++; docs.push(d.data()); } });
            document.getElementById("home-kalamkaari-count").textContent = approvedSize;
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

    // Compose Form Toggles
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

    // Push Content to DB
    window.pushContent = function(collection, payload, isLiveDirectly) {
        payload.status = isLiveDirectly ? "approved" : "pending";
        payload.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        db.collection(collection).add(payload).then(() => {
            alert(isLiveDirectly ? "Published successfully!" : "Submitted safely! Awaiting verification.");
            window.location.reload();
        });
    };

    // View Tracker
    window.trackCardViewLogsOnce = function(collection, docId) {
        if(sessionTrackedViews.has(docId)) return; 
        sessionTrackedViews.add(docId);
        db.collection(collection).doc(docId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(e => console.log(e));
    };

    // --- REALTIME TOAST NOTIFICATION ENGINE ---
    window.showRealtimeToast = function(message) {
        let toast = document.getElementById("theeha-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "theeha-toast";
            toast.className = "toast-notification";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("show");
        
        // Hide after 4 seconds automatically
        setTimeout(() => { toast.classList.remove("show"); }, 4000);
    };

    // Standalone Feed Renderer (Blogs & Kashmakash)
    window.renderStandaloneFeed = function(collName, containerId) {
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
                    ${typeof generateCommentsDOM === "function" ? generateCommentsDOM(item.id, collName) : ''}
                `;
                container.appendChild(card);
                if (typeof hookCommentsListener === "function") hookCommentsListener(item.id, collName);
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
            if (typeof attachActionListeners === "function") attachActionListeners();
        });
    };

    // Submissions
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
        };
    }
    
    if(blogSubmitBtn) {
        blogSubmitBtn.onclick = function() {
            if(!currentUser && !flags.guest_post) return alert("Submission Rejected!");
            const txt = document.getElementById("blog-content").value.trim(); const title = document.getElementById("blog-title").value.trim();
            if(!txt || !title) return alert("Title and Content are required!");
            pushContent("siebel", {
                title: title, content: txt, author: document.getElementById("blog-author").value.trim() || "Anonymous",
                image: document.getElementById("blog-img").value.trim(), fontWeight: document.getElementById("blog-font-weight").value, textColor: document.getElementById("blog-text-color").value,
                likes: 0, views: 0, comments_count: 0, shares_count: 0
            }, flags.live_siebel);
        };
    }

    if(kashSubmitBtn) {
        kashSubmitBtn.onclick = function() {
            if(!currentUser && !flags.guest_post) return alert("Submission Rejected!");
            const txt = document.getElementById("kash-content").value.trim(); if(!txt) return alert("Content required!");
            pushContent("kashmakash", { content: txt, author: document.getElementById("kash-author").value.trim() || "Anonymous", likes: 0, views: 0, comments_count: 0, shares_count: 0 }, flags.live_kashmakash);
        };
    }

    // Initialize Kalamkaari
    const feedContainer = document.getElementById("feed-container"); 
    if(feedContainer) {
        const sortSelect = document.getElementById("sort-feed");
        const filterTag = document.getElementById("filter-tag");
        const searchInput = document.getElementById("search-input");
        let cache = [];
        let isInitialLoad = true; // Added flag to prevent notification spam on first load

        window.loadKalamkaari = function() {
            db.collection("kalamkaari").onSnapshot(s => { 
                cache = []; 
                s.forEach(d => { const item = d.data(); if (item.status === "approved" || !item.status) { cache.push({id: d.id, ...item}); } }); 
                
                // Trigger realtime notification only for new additions after initial setup
                if (!isInitialLoad) {
                    s.docChanges().forEach(change => {
                        if (change.type === "added") {
                            const newItem = change.doc.data();
                            if (newItem.status === "approved" || !newItem.status) {
                                showRealtimeToast(`🔔 New Kalamkaari by ${newItem.author}!`);
                            }
                        }
                    });
                }
                
                if (sortSelect.value === "likes") cache.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                else cache.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                
                applyFiltersAndRender(); 
                isInitialLoad = false; // Mark initial load as done
            });
        };

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
                    ${typeof generateCommentsDOM === "function" ? generateCommentsDOM(item.id, "kalamkaari") : ''}
                `;
                feedContainer.appendChild(card);
                if (typeof hookCommentsListener === "function") hookCommentsListener(item.id, "kalamkaari");
                trackCardViewLogsOnce("kalamkaari", item.id);
            });
            if (typeof attachActionListeners === "function") attachActionListeners();
        };
        [sortSelect, filterTag].forEach(el => el.onchange = loadKalamkaari);
        searchInput.oninput = applyFiltersAndRender;
        loadKalamkaari();
    }

    if (document.getElementById("blogs-feed-container")) renderStandaloneFeed("siebel", "blogs-feed-container");
    if (document.getElementById("kashmakash-feed-container")) renderStandaloneFeed("kashmakash", "kashmakash-feed-container");
});