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
            if(!currentUser && !flags.guest_comment) return alert("Interaction Blocked: Please log in first!");
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
                db.collection(coll).doc(id).update({ comments_count: firebase.firestore.FieldValue.increment(1) }).then(() => { input.value = ""; });
            });
        };
    });
};