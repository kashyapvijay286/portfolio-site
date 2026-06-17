// File: api/rhyme.js (UPDATED FOR MODERN VERCEL ARCHITECTURE)
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // URL parameters handle karne ke liye (Vercel automatic req.query ya standard URL check)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const word = url.searchParams.get('word') || req.query?.word;
    
    if (!word) {
        return res.status(400).json({ error: "Word parameter is required" });
    }

    try {
        // 1. Target URL (Hindi query word is URL Encoded)
        const targetUrl = `https://hi.azrhymes.com/?तुकबंदी=${encodeURIComponent(word)}`;

        // 2. HTTP Request with User-Agent
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 6000 // 6 seconds timeout agar target site slow ho
        });

        // 3. HTML Parsing using Cheerio
        const $ = cheerio.load(response.data);
        const rhymingWords = new Set(); // Auto-deduplication

        // 4. CSS Selector targeting
        $('span.result').each((index, element) => {
            let rawText = $(element).text().trim();
            
            // 5. Data Sanitization: Remove comma at the end and re-trim
            if (rawText.endsWith(',')) {
                rawText = rawText.slice(0, -1).trim();
            }
            
            if (rawText) {
                rhymingWords.add(rawText);
            }
        });

        // 6. Return clean JSON Array
        return res.status(200).json(Array.from(rhymingWords));

    } catch (error) {
        console.error("Scraping Error:", error.message);
        return res.status(500).json({ 
            error: "Failed to fetch rhyming words", 
            details: error.message 
        });
    }
}
