// ==========================================
// 5. LIKES, COMMENTS & SHARES ENGINE
// ==========================================
window.generateCommentsDOM = function(id, coll) {
    return `<div class="comments-section" id="comments-box-node-${id}"><div class="comment-input-block"><input type="text" placeholder="Add comment..." class="c-input"><button class="btn c-send-btn" data-coll="${coll}" data-id="${id}" style="padding:0.2rem 0.6rem; font-size:0.75rem;">Add</button></div><ul class="comment-list" id="comments-list-${id}"></ul></div>`;
};

window.hookCommentsListener = function(id, coll) {
    const list = document.getElementById(`comments-list-${id}`);
    db.collection(coll).doc(id).collection("comments").orderBy("timestamp", "asc").onSnapshot(s => {
        if(!list) return; list.innerHTML = "";
        s.forEach(d => { const li = document.createElement("li"); li.className = "comment-item"; li.textContent = d.data().text; list.appendChild(li); });
        const lbl = document.getElementById(`comment-lbl-cnt-${id}`); if(lbl) lbl.textContent = s.size;
    });
};

window.attachActionListeners = function() {
    document.querySelectorAll(".comment-trigger-btn").forEach(btn => {
        btn.onclick = function() {
            const activeUser = window.currentUser || localStorage.getItem("theeha-user");
            if(!activeUser && !flags.guest_comment) return alert("Interaction Blocked: Please log in first!");
            const targetBox = document.getElementById(`comments-box-node-${this.getAttribute("data-id")}`);
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
            const activeUser = window.currentUser || localStorage.getItem("theeha-user") || "Guest";

            if (hasLiked) {
                // Unlike Logic
                this.classList.remove("liked"); localStorage.removeItem(`liked_${id}`);
                currentLikes--; countSpan.textContent = currentLikes;
                ref.update({ likes: firebase.firestore.FieldValue.increment(-1) });
            } else {
                // Like Logic
                this.classList.add("liked"); localStorage.setItem(`liked_${id}`, "true");
                currentLikes++; countSpan.textContent = currentLikes;
                ref.update({ likes: firebase.firestore.FieldValue.increment(1) });

                // ✅ BROADCAST NOTIFICATION CODE (Sabko jayega)
                db.collection(coll).doc(id).get().then(docSnap => {
                    if (docSnap.exists) {
                        const postData = docSnap.data();
                        const postAuthor = postData.author || "kisi";

                        // Agar user khud apni post like kare toh notification na bhejo
                        if (postAuthor.toLowerCase() !== activeUser.toLowerCase() && postAuthor !== "Anonymous") {
                            
                            let targetUrl = "https://portfolio-site-indol-two-58.vercel.app/";
                            if (coll === "kalamkaari") targetUrl += "kalamkaari.html";
                            else if (coll === "siebel") targetUrl += "siebel-blogs.html";
                            else if (coll === "kashmakash") targetUrl += "kashmakash.html";

                            const API_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" 
                                ? "https://portfolio-site-indol-two-58.vercel.app/api/notify" 
                                : "/api/notify";

                            // Frontend se 'targetUser' hata diya gaya hai, isliye ab Vercel API isko sabko bhej dega
                            fetch(API_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    title: "❤️ Naya Like!", 
                                    message: `${activeUser} ne ${postAuthor} ki post par dil (❤️) diya hai!`, 
                                    url: targetUrl
                                })
                            }).then(res => res.json()).then(data => {
                                console.log("Broadcast Like Notification Server Response:", data);
                            }).catch(e => console.log("Notification API Failed:", e));
                        }
                    }
                }).catch(err => console.log("Error fetching post data:", err));
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
            const activeUser = window.currentUser || localStorage.getItem("theeha-user");
            if(!activeUser && !flags.guest_comment) return alert("Comment Blocked: Please log in first!");
            const id = btn.getAttribute("data-id"); const coll = btn.getAttribute("data-coll");
            const input = this.parentElement.querySelector(".c-input"); if(!input.value.trim()) return;
            
            const authorSignature = activeUser ? `[👤 ${activeUser}]:` : `[👤 Guest]:`;
            const finalCommentString = `${authorSignature} ${input.value.trim()}`;
            
            db.collection(coll).doc(id).collection("comments").add({ text: finalCommentString, timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
                db.collection(coll).doc(id).update({ comments_count: firebase.firestore.FieldValue.increment(1) }).then(() => { input.value = ""; });
            });
        };
    });
};