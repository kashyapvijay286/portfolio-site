// File: api/rhyme.js
const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // CORS bypass ke liye headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { word } = req.query;
    
    if (!word) {
        return res.status(400).json({ error: "Word parameter is required" });
    }

    try {
        // 1. Target URL (Aapka query word URL Encode ho raha hai)
        const targetUrl = `https://hi.azrhymes.com/?तुकबंदी=${encodeURIComponent(word)}`;

        // 2. HTTP Request with Standard User-Agent (Anti-bot block se bachne ke liye)
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        // 3. HTML Parsing using Cheerio
        const $ = cheerio.load(response.data);
        const rhymingWords = new Set(); // Set use kar rahe hain taaki duplicates apne aap remove ho jayein

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
        return res.status(500).json({ error: "Failed to fetch rhyming words", details: error.message });
    }
}