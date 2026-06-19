// File: api/rhyme.js (CLOUDFLARE WORKER PROXY ENGINE - DYNAMIC PAYLOAD)
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
        // 🚀 AAPKA CLOUDFLARE WORKER URL
        const workerUrl = 'https://tukbandi-proxy.kashyapvijay286.workers.dev/';

        // 🎯 DYNAMIC PAYLOAD (Strict filters hata diye taaki har length ke shabd aayen)
        const requestPayload = {
            "search_type": "rhyme",
            "search_subtype": "vowel",
            "sort": 0,
            "q": word.trim(),
            "lang": "hi"
        };

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
        
        // Vercel Log mein check karne ke liye ki API ne kya bheja
        console.log(`Raw API Response for "${word}":`, JSON.stringify(data));

        if (data && data.words && data.words.length > 0) {
            const cleanRhymingWords = data.words.map(w => w.text).filter(Boolean);
            const uniqueRhymes = [...new Set(cleanRhymingWords)];
            
            return res.status(200).json(uniqueRhymes);
        }

        // Agar API ne valid JSON diya par words nahi mile
        return res.status(200).json([]);

    } catch (error) {
        console.error("Cloudflare Worker Failure:", error.message);
        return res.status(500).json({ error: "Technical issue with live rhyming server" });
    }
}
