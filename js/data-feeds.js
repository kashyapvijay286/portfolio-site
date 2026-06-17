// ==========================================
// 4. CONTENT SUBMISSIONS & FEEDS (WITH REALTIME NOTIFICATIONS AND VOICE)
// ==========================================

// 🕒 Helper Function: Time ko display format me badalne ke liye (UPDATED TO 24-HOUR & COMPACT)
function formatPostDateTime(timestamp) {
    if (!timestamp) return "Just now";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        
        // 24-Hour Formatter without extra wide spaces
        const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        return `${dateStr} ${timeStr}`; // Example: "17 Jun 14:05"
    } catch(e) {
        return "Just now";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.getVoices();
        };
    }

    // 🔥 1. EXISTING USERS BACKGROUND DEVICE & ACTIVITY SYNC ENGINE
    if (typeof window.currentUser !== "undefined" && window.currentUser) {
        function getLocalDeviceOS() {
            const ua = navigator.userAgent;
            if (/android/i.test(ua)) return "Android Mobile";
            if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "iOS (iPhone)";
            if (/Win/i.test(ua)) return "Windows PC";
            if (/Mac/i.test(ua)) return "Mac PC";
            return "Unknown OS";
        }

        async function getLocalMobileModel() {
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

        const userDocRef = db.collection("users_registry").doc(window.currentUser.toLowerCase());
        userDocRef.get().then(async (doc) => {
            if (doc.exists) {
                const userData = doc.data();
                let updatePayload = { lastActive: firebase.firestore.FieldValue.serverTimestamp() };
                if (!userData.deviceOS || !userData.deviceModel) {
                    updatePayload.deviceOS = getLocalDeviceOS();
                    updatePayload.deviceModel = await getLocalMobileModel();
                }
                userDocRef.update(updatePayload).catch(err => console.log("Silent sync failed:", err));
            }
        }).catch(err => console.log("User sync query failed:", err));
    }
    
    // 🔥 2. INLINE CHALLENGE WORDS DISPLAY LOADER
    if (document.getElementById("w1") && document.getElementById("w2")) {
        db.collection("challenges").doc("current").get().then((doc) => {
            if (doc.exists) {
                document.getElementById("w1").innerText = doc.data().word1;
                document.getElementById("w2").innerText = doc.data().word2;
            }
        }).catch(e => console.log("Challenge text load error:", e));
    }
    
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
            if(!window.currentUser && !flags.guest_post) return alert("Submissions Locked: Guests cannot post content!");
            if (targetForm.style.getPropertyValue("display") === "none") {
                targetForm.style.setProperty("display", "flex", "important");
                toggleFormBtn.textContent = "➖ Close Studio";
            } else {
                targetForm.style.setProperty("display", "none", "important");
                toggleFormBtn.textContent = target === "siebel" ? "✒️ Write a Blog" : (target === "kashmakash" ? "✒️ Write a Thought" : "✒️ Write a Piece");
            }
        };
    }

    // 🔥 3. PUSH CONTENT WITH CHALLENGE VERIFICATION
    window.pushContent = function(collection, payload, isLiveDirectly) {
        payload.realUserId = window.currentUser || localStorage.getItem("theeha-user") || "Guest";

        db.collection("challenges").doc("current").get().then((challengeDoc) => {
            if (challengeDoc.exists) {
                const challengeData = challengeDoc.data();
                const w1 = (challengeData.word1 || "").toLowerCase().trim();
                const w2 = (challengeData.word2 || "").toLowerCase().trim();
                const contentText = (payload.content || "").toLowerCase();

                if (w1 && w2 && contentText.includes(w1) && contentText.includes(w2)) {
                    payload.isChallenge = true; 
                } else {
                    payload.isChallenge = false;
                }
            } else {
                payload.isChallenge = false;
            }

            payload.status = isLiveDirectly ? "approved" : "pending";
            payload.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            db.collection(collection).add(payload).then(() => {
                alert(isLiveDirectly ? "Published successfully!" : "Submitted safely! Awaiting verification.");
                
                if (isLiveDirectly) {
                    let notifTitle = collection === "kalamkaari" ? "New Kalamkaari Piece!" : (collection === "siebel" ? "New Siebel Blog!" : "New Kashmakash Thought!");
                    let notifMessage = `By ${payload.author}: "${payload.title ? payload.title : payload.content.substring(0, 40) + '...'}"`;

                    if (payload.isChallenge === true) {
                        notifTitle = "🏆 Nayi Challenge Entry!";
                        notifMessage = `${payload.author} ne aaj ke shabdon par likha hai!`;
                    }

                    let targetUrl = "https://portfolio-site-indol-two-58.vercel.app"; 
                    if (collection === "kalamkaari") targetUrl += "/kalamkaari.html";
                    else if (collection === "siebel") targetUrl += "/siebel-blogs.html";
                    else if (collection === "kashmakash") targetUrl += "/kashmakash.html";

                    fetch('/api/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: notifTitle, message: notifMessage, url: targetUrl }) 
                    }).then(() => { window.location.reload(); }).catch(() => { window.location.reload(); });
                } else {
                    window.location.reload();
                }
            });
        }).catch((err) => {
            payload.isChallenge = false;
            payload.status = isLiveDirectly ? "approved" : "pending";
            payload.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            db.collection(collection).add(payload).then(() => window.location.reload());
        });
    };

    window.trackCardViewLogsOnce = function(collection, docId) {
        if(sessionTrackedViews.has(docId)) return; 
        sessionTrackedViews.add(docId);
        db.collection(collection).doc(docId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(e => console.log(e));
    };

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
        setTimeout(() => { toast.classList.remove("show"); }, 4000);
    };

    // 🔥 THEEHA SPECIAL: HAFIZ SAHAB VOICE ENGINE
    window.readShayariAloud = function(btnElement, docId) {
        if ('speechSynthesis' in window) {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                document.querySelectorAll('.speech-btn').forEach(b => b.innerHTML = '🎙️');
                if (btnElement.getAttribute('data-speaking') === 'true') {
                    btnElement.setAttribute('data-speaking', 'false');
                    return;
                }
            }

            const textElement = document.getElementById(`text-canvas-${docId}`);
            if (!textElement) return;
            let originalText = textElement.innerText || textElement.textContent;

            let lines = originalText.split('\n').filter(l => l.trim() !== '');
            let poeticText = "अर्ज़ किया है... । "; 
            
            if (lines.length > 1) {
                let firstLineWords = lines[0].trim().split(/\s+/);
                poeticText += lines[0] + " । "; 
                if (firstLineWords.length >= 2) {
                    let firstTwoWords = firstLineWords[0] + " " + firstLineWords[1];
                    let remainingWords = firstLineWords.slice(2).join(' ');
                    if (remainingWords.trim() !== '') {
                        poeticText += firstTwoWords + " , ... " + remainingWords + " । ";
                    } else {
                        poeticText += firstTwoWords + " । ";
                    }
                } else {
                    poeticText += lines[0] + " । ";
                }
                for (let i = 1; i < lines.length; i++) {
                    poeticText += lines[i] + " । ";
                }
            } else {
                poeticText += originalText + " । ";
            }

            const heavyWords = ['इश्क', 'इश्क़', 'ishq', 'mohabbat', 'मोहब्बत', 'दिल', 'dil', 'dard', 'दर्द', 'khuda', 'ख़ुदा', 'ज़िंदगी', 'zindagi', 'maut', 'मौत', 'रूह', 'rooh', 'याद', 'yaad'];
            heavyWords.forEach(word => {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                poeticText = poeticText.replace(regex, `${word}, `);
            });

            document.querySelectorAll('.speech-btn').forEach(b => b.setAttribute('data-speaking', 'false'));
            btnElement.innerHTML = '⏸️';
            btnElement.setAttribute('data-speaking', 'true');

            const utterance = new SpeechSynthesisUtterance(poeticText);
            const voices = window.speechSynthesis.getVoices();
            let indianVoice = voices.find(v => v.lang === 'hi-IN' && v.name.includes('Male')) 
                           || voices.find(v => v.lang === 'hi-IN' && v.name.includes('Google')) 
                           || voices.find(v => v.lang === 'hi-IN') 
                           || voices.find(v => v.lang === 'en-IN');
            
            if (indianVoice) utterance.voice = indianVoice;
            utterance.lang = 'hi-IN'; 
            utterance.rate = 0.7;     
            utterance.pitch = 1;   

            utterance.onend = function() {
                btnElement.innerHTML = '🎙️';
                btnElement.setAttribute('data-speaking', 'false');
            };
            utterance.onerror = function() {
                btnElement.innerHTML = '🎙️';
                btnElement.setAttribute('data-speaking', 'false');
            };
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Sorry, your browser doesn't support the voice feature!");
        }
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
                const timeString = formatPostDateTime(item.timestamp);

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span class="card-tag" style="background:var(--accent-color); font-weight:700;"># ${serialNumber}</span>
                        ${collName === 'kashmakash' ? `<button class="speech-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; cursor: pointer; transition: 0.3s;" onclick="readShayariAloud(this, '${item.id}')">🎙️</button>` : ''}
                    </div>
                    ${headerHTML}
                    <div class="quote-row"><div class="article-text ${weightClass} ${colorClass}" id="text-canvas-${item.id}" style="${isBlog ? 'font-size:0.92rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;' : ''}">${item.content}</div></div>
                    ${item.image ? `<img src="${item.image}" class="blog-embedded-img" id="img-canvas-${item.id}" style="${isBlog ? 'display:none;' : ''}" onerror="this.style.display='none'">` : ''}
                    ${isBlog ? `<div style="margin-top:0.5rem; text-align: left;"><span id="trigger-btn-${item.id}" class="card-tag" style="background:var(--bg-primary); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; font-weight:600;">📖 Read Full Blog</span></div>` : ''}
                    <div class="article-meta-row"><div class="article-author"><b>${item.author}</b> &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0}</span></div></div>
                    
                    <div class="instagram-action-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0 0 0;">
                        <div style="display: flex; gap: 8px;">
                            <button class="ig-btn like-btn" data-coll="${collName}" data-id="${item.id}">❤️ <span class="ig-count-label">${item.likes || 0}</span></button>
                            <button class="ig-btn comment-trigger-btn" data-id="${item.id}">💬 <span class="ig-count-label" id="comment-lbl-cnt-${item.id}">${item.comments_count || 0}</span></button>
                            <button class="ig-btn share-btn" data-coll="${collName}" data-id="${item.id}" data-text="${encodeURIComponent(item.content)}">📤 <span class="ig-count-label">${item.shares_count || 0}</span></button>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); opacity: 0.75; font-family: monospace; letter-spacing: -0.2px; padding-right: 4px;">
                            ${timeString}
                        </div>
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
            if(!window.currentUser && !flags.guest_post) return alert("Submission Rejected!");
            const txt = document.getElementById("input-content").value.trim(); if(!txt) return;
            pushContent("kalamkaari", {
                content: txt, author: document.getElementById("input-author").value.trim() || "Anonymous",
                tag: document.getElementById("input-tag").value, cardStyle: flags.canvas ? selectedStyle : "grad-default", likes: 0, views: 0, comments_count: 0, shares_count: 0
            }, flags.live_kalamkaari);
        };
    }
    
    if(blogSubmitBtn) {
        blogSubmitBtn.onclick = function() {
            if(!window.currentUser && !flags.guest_post) return alert("Submission Rejected!");
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
            if(!window.currentUser && !flags.guest_post) return alert("Submission Rejected!");
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
        let isInitialLoad = true; 

        window.loadKalamkaari = function() {
            db.collection("kalamkaari").onSnapshot(s => { 
                cache = []; 
                s.forEach(d => { const item = d.data(); if (item.status === "approved" || !item.status) { cache.push({id: d.id, ...item}); } }); 
                
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
                isInitialLoad = false; 
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
                card.style.position = "relative";
                const timeString = formatPostDateTime(item.timestamp);
                
                card.innerHTML = `
                    <button class="speech-btn" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; cursor: pointer; transition: 0.3s; z-index: 10;" onclick="readShayariAloud(this, '${item.id}')">🎙️</button>
                    <div class="quote-row" style="margin-top: 15px;"><div class="article-text" id="text-canvas-${item.id}">"${item.content}"</div></div>
                    <div class="article-meta-row" style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="article-author"><b>${item.author}</b> &nbsp;&nbsp;<span style="opacity:0.6;">👁️ ${item.views || 0}</span></div>
                        <div style="display: flex; gap: 5px; align-items: center;">
                            ${item.isChallenge === true || item.isChallenge === "true" ? `<span style="color: #fbd556; font-weight: bold; font-size: 0.85rem; background: #312e81; padding: 2px 8px; border-radius: 4px;">#WordChallenge</span>` : ''}
                            <span class="card-tag">${item.tag || 'General'}</span>
                        </div>
                    </div>
                    
                    <div class="instagram-action-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0 0 0;">
                        <div style="display: flex; gap: 8px;">
                            <button class="ig-btn like-btn" data-coll="kalamkaari" data-id="${item.id}">❤️ <span class="ig-count-label">${item.likes || 0}</span></button>
                            <button class="ig-btn comment-trigger-btn" data-id="${item.id}">💬 <span class="ig-count-label" id="comment-lbl-cnt-${item.id}">${item.comments_count || 0}</span></button>
                            <button class="ig-btn share-btn" data-coll="kalamkaari" data-id="${item.id}" data-text="${encodeURIComponent(item.content)}">📤 <span class="ig-count-label">${item.shares_count || 0}</span></button>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); opacity: 0.75; font-family: monospace; letter-spacing: -0.2px; padding-right: 4px;">
                            ${timeString}
                        </div>
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

    // 🔥 5. VOICE TYPING ENGINE (FIXED: WORD REPETITION BUG ELIMINATED)
    window.initVoiceTyping = function(btnId, inputId) {
        const micBtn = document.getElementById(btnId);
        const textInput = document.getElementById(inputId);

        if (!micBtn || !textInput) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            micBtn.style.display = "none";
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false; // Set to false to avoid double capturing interim speech
        recognition.lang = 'hi-IN'; 

        let isRecording = false;

        micBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = () => {
            isRecording = true;
            micBtn.innerHTML = "🔴 Sun raha hoon...";
            micBtn.style.color = "#ef4444";
            micBtn.style.borderColor = "#ef4444";
        };

        recognition.onresult = (event) => {
            // Processing only new & finalized transcripts to stop duplicates
            let finalPhrase = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalPhrase += event.results[i][0].transcript;
                }
            }
            
            if (finalPhrase) {
                const currentVal = textInput.value;
                const cleanAppend = currentVal.endsWith(' ') || currentVal === '' ? '' : ' ';
                textInput.value = currentVal + cleanAppend + finalPhrase.trim();
            }
        };

        recognition.onend = () => {
            isRecording = false;
            micBtn.innerHTML = "🎙️ Bol Kar Likhein";
            micBtn.style.color = "var(--text-main)";
            micBtn.style.borderColor = "var(--border-color)";
        };

        recognition.onerror = (event) => {
            isRecording = false;
            micBtn.innerHTML = "🎙️ Bol Kar Likhein";
            micBtn.style.color = "var(--text-main)";
            micBtn.style.borderColor = "var(--border-color)";
            if (event.error === 'not-allowed') {
                alert("Microphone ki permission allow karein tabhi ye kaam karega!");
            }
        };
    };

    // Initialize Kalamkaari Voice Typing
    initVoiceTyping('mic-btn-kalamkaari', 'input-content');

});