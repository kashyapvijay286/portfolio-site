// File: api/rhyme.js (BULLETPROOF IN-BUILT RHYMING ENGINE)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const url = new URL(req.url, `http://${req.headers.host}`);
    const word = url.searchParams.get('word') || req.query?.word;
    
    if (!word) {
        return res.status(400).json({ error: "Word parameter is required" });
    }

    // 📚 Huge Hindi/Urdu Poetic Database (Directly in memory for speed & 100% uptime)
    const poeticDatabase = [
        // आन् (aan) sound
        "जान", "जहान", "इम्तिहान", "अनजान", "मेहमान", "नुकसान", "पहचान", "आसमान", "अरमान", "शान", "मकान", "दुकान", "सुल्तान", "बयान", "समान", "ईमान", "मेहरबान", "परेशान", "निगाहबान",
        // आर् (aar) sound
        "प्यार", "यार", "इंतज़ार", "इकरार", "बहार", "हज़ार", "दिलदार", "बीमार", "करार", "दीदार", "गुलज़ार", "सरदार", "लाचार", "बेकरार", "संसार", "उधार", "दीवार", "तलवार", "तैयार",
        // इल् (il) sound
        "दिल", "मिल", "महफ़िल", "मंज़िल", "क़ातिल", "साहिल", "हासिल", "मुश्किल", "काबिल", "शामिल", "बिस्मिल", "ग़ाफ़िल", "ज़ाहिल", "फ़ाज़िल",
        // आत् (aat) sound
        "रात", "बात", "साथ", "मुलाक़ात", "हालात", "जज़्बात", "बरसात", "क़ायनात", "सौगात", "वफ़ात", "ज़ात", "औकात", "मात", "हात", "शुरुआत",
        // ई (ee) / गी (gi) sound
        "ज़िंदगी", "बंदगी", "आवारगी", "दीवानगी", "सादगी", "तिश्नगी", "नाराज़गी", "बज़ारूगी", "ताज़गी", "दीदगी", "खुशी", "बेखुदी", "शायरी", "आशिकी", "दिल्लगी", "दोस्ती", "बेबसी",
        // अद् (ard / urd) sound
        "दर्द", "हमदर्द", "ज़र्द", "सर्द", "गर्द", "मर्ज़", "फ़र्ज़", "क़र्ज़",
        // अफ़् / अल् (ar / al) sound
        "सफ़र", "नगर", "क़बर", "सबर", "क़दर", "नज़र", "लहर", "सहर", "ज़हर", "मगर", "असर", "हमनफ़स", "बेअसर", "उम्र", "फ़िक्र", "ज़िक्र",
        // अस् (aas) sound
        "पास", "आस", "एहसास", "खास", "उदास", "प्यास", "लिबास", "तलाश", "तराश", "रास", "बकवास",
        // आ (aa) sound / वफ़ा
        "वफ़ा", "ख़फ़ा", "दफ़ा", "सफ़ा", "नशा", "दुआ", "सदा", "अदा", "फ़िदा", "जुदा", "ख़ुदा", "हवा", "दवा", "सज़ा", "मज़ा", "जफ़ा", "शफ़ा",
        // ओना (ona) sound
        "रोना", "सोना", "खोने", "होना", "जोना", "सलोना", "खिलौना", "कोना", "बोना", "रोना-धोना",
        // ईन् (een) sound
        "हसीन", "ज़मीन", "नज़नीन", "यकीन", "कमीन", "शौकीन", "ग़मगीन", "रंगीन", "आमीन",
        // ऊ (oo) sound
        "तू", "हू", "खुशबू", "गिरेबां", "रूबरू", "जुस्तजू", "आरज़ू", "गुफ़्तगू", "लहू", "आंसू", "जादू"
    ];

    try {
        const cleanInput = word.trim();
        
        // Match karne ke liye logic: Last ke 2 characters match karo (Hindi text engineering)
        // Jaise "जान" ka last sound 'ान' या 'ान' se match hone wale saare words
        let lastChar = cleanInput.slice(-1);
        let lastTwoChars = cleanInput.slice(-2);

        let matches = poeticDatabase.filter(item => {
            if (item === cleanInput) return false; // Khud us shabd ko remove karo
            
            // Check matching suffix
            return item.endsWith(lastTwoChars) || item.endsWith(lastChar);
        });

        // Agar database chota pade, toh dynamic sorting algorithm apply karein jisse accurate rhymes upar aayein
        matches.sort((a, b) => {
            const aMatch = a.endsWith(lastTwoChars) ? 1 : 0;
            const bMatch = b.endsWith(lastTwoChars) ? 1 : 0;
            return bMatch - aMatch;
        });

        // Duplicates remove karein (Max 30 words bhejein taaki UI kharab na ho)
        const finalResult = [...new Set(matches)].slice(0, 35);

        return res.status(200).json(finalResult);

    } catch (error) {
        return res.status(500).json({ error: "Rhyme engine failure", details: error.message });
    }
}
