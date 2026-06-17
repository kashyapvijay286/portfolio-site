// File: api/rhyme.js (PURE LIVE API PROXY - NO INTERNAL WORDS)
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const url = new URL(req.url, `http://${req.headers.host}`);
    const word = url.searchParams.get('word') || req.query?.word;
    
    if (!word) {
        return res.status(400).json({ error: "Word parameter is required" });
    }

    try {
        // 1. Live target URL jahan se real-time words nikalne hain
        const targetUrl = `https://hi.azrhymes.com/?तुकबंदी=${encodeURIComponent(word)}`;

        // 2. Real browser jaisa header taaki website block na kare (Bohot zaroori)
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'hi,en-US;q=0.7,en;q=0.3'
            },
            timeout: 8000 // 8 seconds ka wait agar site thodi slow ho toh
        });

        // 3. HTML parsing (Jo aapne selector bataya tha)
        const $ = cheerio.load(response.data);
        const rhymingWords = new Set(); // Duplicates hatane ke liye

        // 4. Exact 'span.result' se live words nikalna
        $('span.result').each((index, element) => {
            let rawText = $(element).text().trim();
            
            // Comma hatana
            if (rawText.endsWith(',')) {
                rawText = rawText.slice(0, -1).trim();
            }
            
            if (rawText) {
                rhymingWords.add(rawText);
            }
        });

        // 5. Seedha live data array banakar bhej do
        return res.status(200).json(Array.from(rhymingWords));

    } catch (error) {
        console.error("Live Scraping Error:", error.message);
        return res.status(500).json({ error: "Live API se connect nahi ho paya", details: error.message });
    }
}
