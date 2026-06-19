// File: api/rhyme.js (OFFICIAL AZRHYMES API WITH CLOUDFLARE CLEARANCE & AUTH COOKIES)
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
        const targetUrl = 'https://hi.azrhymes.com/more_results';

        const requestPayload = {
            "search_type": "rhyme",
            "search_subtype": "rhyme", // Aapke payload ke hisaab se updated
            "sort": 0,
            "q": word.trim(),
            "lang": "hi",
            "current_pronunciation": 1,
            "strict": 0
            // n_syllables aur exclude hata diya gaya hai taaki zyada aur har size ke results aayen
        };

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "content-type": "application/json",
                "pragma": "no-cache",
                "sec-ch-ua": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                
                // 🛑 AAPKE BROWSER KI EXACT COOKIES & CLOUDFLARE CLEARANCE 🛑
                "cookie": "visitor=\"db5296dd-9eb8-4406\"; _ga=GA1.1.1557110889.1781695262; ext_name=ojplmecpdpgccookcobabopnaifgidhf; csrftoken=OTLpwOEhf0niLXh5JmpElTBscVb6MkYr; visit_count=10; _ga_6BMN5YHCV9=GS2.1.s1781854248$o5$g1$t1781854248$j60$l0$h0; cf_clearance=sfhjRKPGhg1q0wJ8lVUp9Y.I.R6EoSw3wQhVHwjT.ss-1781854249-1.2.1.1-KMN81EDS4qleZa1ffajeq3DtxTO2jyoa6WrpXTHtXo.MwwWQ35GglOfolTIHsas20DI.SEt2jdxpgl8hQRSRxkR_b_laHs.5PTGEuU3ubNc97SFArJnDlnkPoEJsh8R7MhhO.cvMeepwZjJzZVBL_i6_NteINl6p.kkiZLTIaf2LA1tb5QSb6Nvu8BKTfGzrfKjZZr7MgMA6TCXpA_UMIK8mIk_iL4DuOgpCvXzhyHMIauBuKvo5ew71EvC6w8VpOKc5lMRVPxZcMoX7oT6avq0mel_dLtaNHsWc362jHBt9fqkINttS1JsumbS3rcd9.r819fFm4mhbIPBL9Z3VWg",
                
                // Referer mein dynamic word pass kar diya
                "Referer": "https://hi.azrhymes.com/?%E0%A4%A4%E0%A5%81%E0%A4%95%E0%A4%AC%E0%A4%82%E0%A4%A6%E0%A5%80=" + encodeURIComponent(word.trim()),
                
                // Django backend verify karne ke liye cookie me se token explicitly pass kiya
                "X-CSRFToken": "OTLpwOEhf0niLXh5JmpElTBscVb6MkYr"
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`API Auth or Network failure: ${response.status}`);
        }

        const data = await response.json();
        
        console.log(`Raw API Response for "${word}":`, JSON.stringify(data));

        if (data && data.words) {
            const cleanRhymingWords = data.words.map(w => w.text).filter(Boolean);
            const uniqueRhymes = [...new Set(cleanRhymingWords)];
            
            return res.status(200).json(uniqueRhymes);
        }

        return res.status(200).json([]);

    } catch (error) {
        console.error("Official API Failure:", error.message);
        return res.status(500).json({ error: "Technical issue with live rhyming server" });
    }
}
