// /api/notify.js

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 1. req.body se ab hum 'url' bhi nikalenge
    const { title, message, url } = req.body; 

    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID; 
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY; 

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        return res.status(500).json({ success: false, error: "API Keys missing in Vercel" });
    }

    const payload = {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Total Subscriptions", "Subscribed Users"], 
        headings: { en: title },
        contents: { en: message },
        // 2. Yahan fix link ki jagah hum dynamic 'url' use karenge
        url: url || "https://theeha.vercel.app" 
    };

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}