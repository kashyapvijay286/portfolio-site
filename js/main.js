// TODO: Replace this placeholder object with YOUR real configuration from Firebase Console!
const firebaseConfig = {
    apiKey: "AIzaSyC62G11uTXCOHSULYWnG3lF8TWRtBBqO6A",
    authDomain: "theeha-fdd1f.firebaseapp.com",
    projectId: "theeha-fdd1f",
    storageBucket: "theeha-fdd1f.firebasestorage.app",
    messagingSenderId: "386632767113",
    appId: "1:386632767113:web:ca406cf5b4e00e82c25858"
};

// Initialize Firebase Core and Firestore Database
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {

    // --- 1. HOME PAGE LOGIC ---
    const homeCountEl = document.getElementById("home-kalamkaari-count");
    if (homeCountEl) {
        // Fetch snapshot of collection to count real-time global documents
        db.collection("kalamkaari").onSnapshot((snapshot) => {
            homeCountEl.textContent = snapshot.size;
        });
    }

    // --- 2. KALAMKAARI FEED LOGIC ---
    const feedContainer = document.getElementById("feed-container");
    const submitBtn = document.getElementById("submit-btn");
    const inputAuthor = document.getElementById("input-author");
    const inputContent = document.getElementById("input-content");
    const sortSelect = document.getElementById("sort-feed");

    if (!feedContainer) return; // Halt script execution if not browsing Kalamkaari page

    let currentFeedData = [];

    // Connects to Firebase collection and listens for changes live
    function listenToDatabase() {
        const sortBy = sortSelect.value;
        let query = db.collection("kalamkaari");

        if (sortBy === "likes") {
            query = query.orderBy("likes", "desc");
        } else {
            query = query.orderBy("timestamp", "desc");
        }

        // OnSnapshot updates instantly without forcing page reloads
        query.onSnapshot((snapshot) => {
            currentFeedData = [];
            feedContainer.innerHTML = ""; // Clear existing UI list

            if (snapshot.empty) {
                feedContainer.innerHTML = "<p style='color: var(--text-muted); text-align:center;'>The feed is empty. Be the first to write something!</p>";
                return;
            }

            snapshot.forEach((doc) => {
                const item = doc.data();
                currentFeedData.push({ id: doc.id, ...item });

                const card = document.createElement("div");
                card.className = "article-card";
                card.innerHTML = `
                    <div class="quote-row">
                        <div class="article-text">"${item.content}"</div>
                        <button class="like-btn" data-id="${doc.id}">
                            ❤️ <span class="count">${item.likes || 0}</span>
                        </button>
                    </div>
                    <div class="article-author">— ${item.author || "Anonymous"}</div>
                `;
                feedContainer.appendChild(card);
            });

            attachLikeEventListeners();
        });
    }

    // Capture submissions and write documents directly to Firebase
    submitBtn.addEventListener("click", () => {
        const text = inputContent.value.trim();
        const author = inputAuthor.value.trim();

        if (text === "") {
            alert("Content area cannot be completely empty!");
            return;
        }

        console.log("Firebase mein data bheja ja raha hai...");

        const newItem = {
            content: text,
            author: author || "Anonymous",
            likes: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Explicitly collection ka naam check karein aur add karein
        db.collection("kalamkaari").add(newItem)
            .then((docRef) => {
                console.log("Data successfully save ho gaya! Document ID: ", docRef.id);
                alert("Aapka quote successfully publish ho gaya hai!");
                inputContent.value = "";
                inputAuthor.value = "";
            })
            .catch((error) => {
                console.error("Firebase mein data likhne me error aaya: ", error);
                alert("Error: " + error.message);
            });
    });

    // Handle like actions by updating cloud metrics directly
    function attachLikeEventListeners() {
        const likeButtons = document.querySelectorAll(".like-btn");

        likeButtons.forEach(button => {
            button.addEventListener("click", function() {
                const docId = this.getAttribute("data-id");
                const docRef = db.collection("kalamkaari").doc(docId);
                
                // Track visual state locally inside user browser storage instance 
                // so they can toggle their own specific likes back and forth
                const storageKey = `liked_${docId}`;
                const hasLiked = localStorage.getItem(storageKey) === "true";

                if (hasLiked) {
                    // Decrement down cloud count
                    docRef.update({
                        likes: firebase.firestore.FieldValue.increment(-1)
                    });
                    this.classList.remove("liked");
                    localStorage.removeItem(storageKey);
                } else {
                    // Increment up cloud count
                    docRef.update({
                        likes: firebase.firestore.FieldValue.increment(1)
                    });
                    this.classList.add("liked");
                    localStorage.setItem(storageKey, "true");
                }
            });

            // Keep heart colored if user already liked this previously on their device
            const docId = button.getAttribute("data-id");
            if (localStorage.getItem(`liked_${docId}`) === "true") {
                button.classList.add("liked");
            }
        });
    }

    // Monitor sorting menu filter modifications
    sortSelect.addEventListener("change", listenToDatabase);

    // Initial Engine Startup 
    listenToDatabase();
});