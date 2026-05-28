// Sample seed data architecture (adding timestamps for precise sorting verification)
let feedData = JSON.parse(localStorage.getItem("theeha_feed")) || [
    {
        id: 1,
        content: "Write to be understood, speak to be heard, read to grow.",
        author: "Lawrence Clark Powell",
        likes: 12,
        timestamp: Date.now() - 60000 // 1 minute ago
    },
    {
        id: 2,
        content: "In the dark digital space, clear architecture acts as our brightest lantern.",
        author: "System Architect",
        likes: 42,
        timestamp: Date.now() - 120000 // 2 minutes ago
    }
];

document.addEventListener("DOMContentLoaded", () => {
    // 1. HOME PAGE SPECIFIC LOGIC
    const homeCountEl = document.getElementById("home-kalamkaari-count");
    if (homeCountEl) {
        homeCountEl.textContent = feedData.length;
    }

    // 2. KALAMKAARI PAGE SPECIFIC LOGIC
    const feedContainer = document.getElementById("feed-container");
    const submitBtn = document.getElementById("submit-btn");
    const inputAuthor = document.getElementById("input-author");
    const inputContent = document.getElementById("input-content");
    const sortSelect = document.getElementById("sort-feed");

    if (!feedContainer) return; // Exit if not on Kalamkaari page

    // Core Rendering Engine with Sort logic filtering
    function renderFeed() {
        const sortBy = sortSelect.value;
        let sortedArray = [...feedData];

        if (sortBy === "likes") {
            // Sort by absolute highest likes descending
            sortedArray.sort((a, b) => b.likes - a.likes);
        } else {
            // Sort by newest chronological timestamp descending
            sortedArray.sort((a, b) => b.timestamp - a.timestamp);
        }

        feedContainer.innerHTML = ""; // Flush DOM contents

        sortedArray.forEach(item => {
            const card = document.createElement("div");
            card.className = "article-card";
            card.innerHTML = `
                <div class="quote-row">
                    <div class="article-text">"${item.content}"</div>
                    <button class="like-btn" data-id="${item.id}">
                        ❤️ <span class="count">${item.likes}</span>
                    </button>
                </div>
                <div class="article-author">— ${item.author || "Anonymous"}</div>
            `;
            feedContainer.appendChild(card);
        });

        attachLikeEventListeners();
    }

    // User submission parsing engine
    submitBtn.addEventListener("click", () => {
        const text = inputContent.value.trim();
        const author = inputAuthor.value.trim();

        if (text === "") {
            alert("Content area cannot be completely empty!");
            return;
        }

        const newItem = {
            id: Date.now(),
            content: text,
            author: author || "Anonymous",
            likes: 0,
            timestamp: Date.now()
        };

        feedData.push(newItem);
        localStorage.setItem("theeha_feed", JSON.stringify(feedData));
        renderFeed();

        // Clear input form spaces
        inputContent.value = "";
        inputAuthor.value = "";
    });

    // Handle like counting functionalities
    function attachLikeEventListeners() {
        const likeButtons = document.querySelectorAll(".like-btn");
        
        likeButtons.forEach(button => {
            button.addEventListener("click", function() {
                const itemId = parseInt(this.getAttribute("data-id"));
                const item = feedData.find(f => f.id === itemId);
                const countSpan = this.querySelector(".count");

                if (item) {
                    if (this.classList.contains("liked")) {
                        item.likes--;
                        this.classList.remove("liked");
                    } else {
                        item.likes++;
                        this.classList.add("liked");
                    }
                    countSpan.textContent = item.likes;
                    localStorage.setItem("theeha_feed", JSON.stringify(feedData));
                    
                    // If we are sorted by likes, refresh view dynamically to reposition cards
                    if (sortSelect.value === "likes") {
                        renderFeed();
                    }
                }
            });
        });
    }

    // Sort Selection change monitoring triggers
    sortSelect.addEventListener("change", renderFeed);

    // Initial Engine Fire setup
    renderFeed();
});