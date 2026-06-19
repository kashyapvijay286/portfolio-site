// File: api/rhyme.js (CLOUDFLARE WORKER PROXY ENGINE - 100% SECURE)
export default async function handler(req, res) {
    // CORS Headers setup
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const word = url.searchParams.get('word') || req.query?.word;
    
    if (!word) {
        return res.status(400).json({ error: "Word parameter is required" });
    }

    try {
        // 🚀 AAPKA KHUD KA CLOUDFLARE WORKER URL
        const workerUrl = 'https://tukbandi-proxy.kashyapvijay286.workers.dev/';

        // Exact payload jo target website ko chahiye
        const requestPayload = {
            "search_type": "rhyme",
            "search_subtype": "vowel",
            "sort": 0,
            "q": word.trim(),
            "lang": "hi",
            "current_pronunciation": 1,
            "n_syllables": 1,
            "strict": 0,
            "exclude": "कान" 
        };

        // Worker ko request bhej rahe hain
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`Worker status failure: ${response.status}`);
        }

        const data = await response.json();

        // Data ko clean aur filter karke array banana
        if (data && data.words) {
            const cleanRhymingWords = data.words.map(w => w.text).filter(Boolean);
            const uniqueRhymes = [...new Set(cleanRhymingWords)];
            
            return res.status(200).json(uniqueRhymes);
        }

        return res.status(200).json([]);

    } catch (error) {
        console.error("Cloudflare Worker Failure:", error.message);
        // STRICT RULE: Fallback nahi hoga, seedha UI par error show karenge
        return res.status(500).json({ error: "Technical issue with live rhyming server" });
    }
}
