// File: api/rhyme.js (LIVE SCRAPING WITH BYPASS PROXY)
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
        // 1. Asli Target URL jise scrape karna hai
        const targetUrl = `https://hi.azrhymes.com/?तुकबंदी=${encodeURIComponent(word)}`;

        // 2. 🚀 THE JUGAAD: Wrapping it inside a free global CORS/Bypass proxy
        // Yeh Vercel ke blocked IP ko chhupa kar request ko ghuma ke bhejega
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

        // 3. Requesting via Proxy
        const response = await axios.get(proxyUrl, {
            timeout: 9000 // 9 seconds timeout kyunki proxy ghoom ke aati hai
        });

        // AllOrigins response data ko 'contents' naam ki string ke andar bhejta hai
        const htmlData = response.data.contents;

        if (!htmlData) {
            throw new Error("Proxy did not return any HTML contents");
        }

        // 4. HTML Parsing using Cheerio
        const $ = cheerio.load(htmlData);
        const rhymingWords = new Set(); // Auto-deduplication

        // 5. Aapka bataya hua exact CSS Selector 'span.result'
        $('span.result').each((index, element) => {
            let rawText = $(element).text().trim();
            
            // Data Sanitization: Last ka comma hatana
            if (rawText.endsWith(',')) {
                rawText = rawText.slice(0, -1).trim();
            }
            
            if (rawText) {
                rhymingWords.add(rawText);
            }
        });

        // 6. Return clean live JSON Array to your frontend
        return res.status(200).json(Array.from(rhymingWords));

    } catch (error) {
        console.error("Scraping Bypass Error:", error.message);
        return res.status(500).json({ 
            error: "Live website se data fetch nahi ho paya.", 
            details: error.message 
        });
    }
}
