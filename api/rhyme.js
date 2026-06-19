// File: api/rhyme.js (OFFICIAL JSON API + PROXY BRIDGE - 100% CRASH PROOF)
export default async function handler(req, res) {
    // CORS Headers setup
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const word = url.searchParams.get('word') || req.query?.word;
    
    if (!word) {
        return res.status(400).json({ error: "Word parameter is required" });
    }

    try {
        // 🚀 PROXY BRIDGE: Vercel ke Data Center IP ko chhupane ke liye corsproxy ka use
        const targetUrl = 'https://corsproxy.io/?https://hi.azrhymes.com/more_results';

        const requestPayload = {
            "search_type": "rhyme",
            "search_subtype": "vowel",
            "sort": 0,
            "q": word.trim(),
            "lang": "hi",
            "current_pronunciation": 1,
            "n_syllables": 1,
            "strict": 0 
        };

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify(requestPayload)
        });

        // Agar Proxy ya Target fail hota hai
        if (!response.ok) {
            throw new Error(`Target server status failure: ${response.status}`);
        }

        const data = await response.json();

        // 🎯 Official JSON parse karna
        if (data && data.words) {
            const cleanRhymingWords = data.words.map(w => w.text).filter(Boolean);
            const uniqueRhymes = [...new Set(cleanRhymingWords)];
            
            return res.status(200).json(uniqueRhymes);
        }

        return res.status(200).json([]);

    } catch (error) {
        console.error("Official API Failure:", error.message);
        // STRICT RULE: Technical issue status code, frontend par error message chalane ke liye
        return res.status(500).json({ error: "Technical issue with live rhyming server" });
    }
}
