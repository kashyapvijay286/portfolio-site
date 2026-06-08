document.addEventListener("DOMContentLoaded", () => {
    
    const wrapper = document.getElementById("leaves-wrapper");

    // Fetch approved Kalamkaari posts
    function growTheTree() {
        db.collection("kalamkaari").get().then(snapshot => {
            let posts = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                // Sirf approved posts dikhayenge
                if (data.status !== "pending") {
                    posts.push({ id: doc.id, ...data });
                }
            });

            // Sort by latest timestamp
            posts.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            renderLeaves(posts);
        }).catch(err => console.log("Tree couldn't grow: ", err));
    }

    function renderLeaves(posts) {
        wrapper.innerHTML = "";
        
        if(posts.length === 0) {
            wrapper.innerHTML = "<p style='text-align:center; margin-top:50px;'>The tree is empty. Plant a seed in the studio!</p>";
            return;
        }

        posts.forEach((item, index) => {
            // Alternate Left and Right branches
            const positionClass = index % 2 === 0 ? "left" : "right";
            
            const node = document.createElement("div");
            node.className = `tree-node ${positionClass}`;

            // Tree branch layout logic
            node.innerHTML = `
                ${positionClass === "left" ? `<div class="leaf-wrapper">${createCardHTML(item)}</div><div class="empty-space"></div>` : ''}
                ${positionClass === "right" ? `<div class="empty-space"></div><div class="leaf-wrapper">${createCardHTML(item)}</div>` : ''}
            `;
            
            wrapper.appendChild(node);
        });

        // Initialize scroll animations
        observeTreeGrowth();
    }

    // Leaf Card Component
    function createCardHTML(item) {
        return `
            <div class="leaf-card">
                <div class="leaf-quote">"${item.content}"</div>
                <div class="leaf-meta">
                    <span class="leaf-author">✍️ ${item.author}</span>
                    <span class="leaf-stats">❤️ ${item.likes || 0}</span>
                </div>
            </div>
        `;
    }

    // Intersection Observer for Scroll Animation
    function observeTreeGrowth() {
        const nodes = document.querySelectorAll('.tree-node');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                    // Optional: Stop observing once shown
                    // observer.unobserve(entry.target); 
                }
            });
        }, {
            threshold: 0.15 // 15% card dikhne par animate hoga
        });

        nodes.forEach(node => observer.observe(node));
    }

    // Initialize
    setTimeout(growTheTree, 500); // Slight delay to ensure DB is ready
});