const express = require("express");

const router = express.Router();

// Search open tabs by title or URL
router.post("/search", (req, res) => {
    const { query, tabs } = req.body;

    if (typeof query !== "string" || !Array.isArray(tabs)) {
        return res.status(400).json({
            error: "query and tabs are required"
        });
    }

    const search = query.trim().toLowerCase();

    const results = tabs.filter((tab) => {
        const title = (tab.title || "").toLowerCase();
        const url = (tab.url || "").toLowerCase();

        return title.includes(search) || url.includes(search);
    });

    res.json({ results });
});

// Ask Gemini about the supplied tabs
router.post("/ask", async (req, res) => {
    const { question, tabs } = req.body;

    if (typeof question !== "string" || !Array.isArray(tabs)) {
        return res.status(400).json({
            error: "question and tabs are required"
        });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is missing"
            });
        }

        const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

        const tabContext = tabs
            .map((tab) => {
                return `ID: ${tab.id}\nTitle: ${tab.title || "Untitled"}\nURL: ${tab.url || ""}`;
            })
            .join("\n\n");

        const prompt = `
You help a user understand their currently open browser tabs.
Use only the tab information below to answer the user's question.

Open tabs:
${tabContext}

Question:
${question}
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
                    ]
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

        const answer =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No answer returned.";

        res.json({ answer });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to process AI request"
        });
    }
});

module.exports = router;