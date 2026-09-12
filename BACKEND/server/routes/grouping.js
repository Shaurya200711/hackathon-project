const express = require("express");

const router = express.Router();

// Group related browser tabs with Gemini
router.post("/group", async (req, res) => {
    const { tabs } = req.body;

    if (!Array.isArray(tabs) || tabs.length === 0) {
        return res.status(400).json({
            error: "tabs are required"
        });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const testMode = process.env.TEST_MODE === "true";

        if (!apiKey && !testMode) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is missing"
            });
        }

        if (testMode) {
            return handleTestGrouping(tabs, res);
        }

        const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

        const prompt = `
Organize these browser tabs into useful topic groups.

Tabs:
${JSON.stringify(tabs, null, 2)}

Return ONLY valid JSON in exactly this format:

{
  "groups": [
    {
      "name": "Group name",
      "tabIds": [1, 2]
    }
  ]
}

Rules:
- Use only tab IDs supplied in the input.
- Put every supplied tab ID into one group.
- Do not repeat a tab ID.
- Give each group a short, clear name.
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini error:", data);

            return res.status(response.status).json({
                error: "Gemini request failed"
            });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return res.status(500).json({
                error: "Gemini returned an empty response"
            });
        }

        const result = JSON.parse(text);

        if (!Array.isArray(result.groups)) {
            return res.status(500).json({
                error: "Gemini returned an invalid grouping response"
            });
        }

        res.json({ groups: result.groups });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to group tabs"
        });
    }
});

function handleTestGrouping(tabs, res) {
    const domains = {};
    tabs.forEach(tab => {
        try {
            const domain = new URL(tab.url).hostname.replace("www.", "");
            if (!domains[domain]) domains[domain] = [];
            domains[domain].push(tab.id);
        } catch (e) {
            if (!domains["other"]) domains["other"] = [];
            domains["other"].push(tab.id);
        }
    });

    const groups = Object.entries(domains).map(([domain, tabIds]) => ({
        name: domain.charAt(0).toUpperCase() + domain.slice(1),
        tabIds
    }));

    return res.json({ groups });
}

module.exports = router;