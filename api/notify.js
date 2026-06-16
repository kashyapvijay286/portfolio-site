// /api/notify.js

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

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

    // 🔥 TARGETING LOGIC UPDATE
    if (targetUser) {
        payload.include_external_user_ids = [targetUser.toLowerCase()];
        // Ye line compulsory hai v1 API mein external ID targeting ke liye
        payload.channel_for_external_user_ids = "push";
    } else {
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
        console.log("OneSignal Target Response:", data); // Is se Vercel me error dikh jayega
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}