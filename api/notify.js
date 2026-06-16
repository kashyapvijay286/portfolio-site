// /api/notify.js

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Frontend se data receive karna (targetUser bhi nikal rahe hain ab)
    const { title, message, url, targetUser } = req.body; 

    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID; 
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY; 

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        return res.status(500).json({ success: false, error: "API Keys missing in Vercel" });
    }

    const payload = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: message },
        url: url || "https://portfolio-site-indol-two-58.vercel.app" 
    };

    // 🔥 MAIN MAGIC: TARGETING LOGIC
    if (targetUser) {
        // Agar specific user ko bhejna hai (Like/Comment ke time)
        // OneSignal is 'targetUser' ke device ko dhund kar sirf use bhejega
        payload.include_external_user_ids = [targetUser.toLowerCase()];
    } else {
        // Agar admin broadcast kar raha hai toh sabko bhejo
        payload.included_segments = ["Total Subscriptions", "Subscribed Users"];
    }

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