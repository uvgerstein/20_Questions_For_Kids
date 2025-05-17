    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env; // Access the API key from Netlify's environment variables
        // Updated API URL to use gemini-2.0-flash model instead of gemini-pro
        const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=';

        // Default to QUESTIONS_PER_GAME (e.g., 12) if not specified in the request query parameters
        // We can't directly access QUESTIONS_PER_GAME from script.js here, so we use a common default or pass it.
        // For simplicity, let's assume a default and allow override via query param.
        const count = event.queryStringParameters && event.queryStringParameters.count
                      ? parseInt(event.queryStringParameters.count)
                      : 12; // Default to 12 questions

        if (!GEMINI_API_KEY) {
            console.error("Gemini API Key is not set in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "API Key not configured on the server." }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const promptText = `Generate ${count} high-quality, educational trivia questions in Hebrew for Israeli children ages 5-8. 

IMPORTANT RULES:
1. NEVER include the answer within the question itself
2. Questions should be challenging but age-appropriate
3. Use simple Hebrew vocabulary suitable for 5-8 year olds
4. Focus on Israeli culture, history, geography, holidays, foods, animals, and landmarks
5. Answers should be 1-3 words when possible
6. Hints should provide a clue without giving away the answer

Format the output as a valid JSON array of objects, where each object has "question", "answer", and "hint" keys.

GOOD EXAMPLES:
[
  {
    "question": "איזה צבעים יש בדגל ישראל?",
    "answer": "כחול ולבן",
    "hint": "אלו גם הצבעים של השמיים והעננים"
  },
  {
    "question": "איזה חג מדליקים בו נרות במשך שמונה ימים?",
    "answer": "חנוכה",
    "hint": "חוגגים אותו בחודש כסלו ואוכלים סופגניות"
  },
  {
    "question": "איזה עיר היא בירת ישראל?",
    "answer": "ירושלים",
    "hint": "עיר עתיקה עם הכותל המערבי"
  }
]

BAD EXAMPLES (DO NOT CREATE QUESTIONS LIKE THESE):
- "מה שמו של דגל ישראל?" (contains answer in question)
- "האם חנוכה הוא חג יהודי?" (yes/no question)
- "מה שם העיר שהיא בירת ישראל, ירושלים?" (reveals answer)

Make all ${count} questions unique, educational, and engaging for young Israeli children.`;

        try {
            const fullApiUrl = `${GEMINI_API_BASE_URL}${GEMINI_API_KEY}`;
            const requestBody = {
                contents: [{
                    parts: [{
                        text: promptText
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            };

            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorBodyText = await response.text();
                console.error('Gemini API request failed:', response.status, errorBodyText);
                return {
                    statusCode: response.status,
                    body: JSON.stringify({ error: `Gemini API request failed: ${response.status}`, details: errorBodyText }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }

            const data = await response.json();
            let questionsJsonString;

            // Adjust this path based on the actual Gemini API response structure
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
                questionsJsonString = data.candidates[0].content.parts[0].text;
            } else {
                console.error("Unexpected Gemini API response structure:", JSON.stringify(data, null, 2));
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: "Could not extract questions string from Gemini API response." }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }

            // Remove potential markdown code block fences if the API returns them
            questionsJsonString = questionsJsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');

            // The questionsJsonString should be the JSON array itself.
            // The client-side will parse this.
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: questionsJsonString, // Send the string directly
            };

        } catch (error) {
            console.error('Error in Netlify function while fetching from Gemini API:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to fetch questions due to a server error.', details: error.message }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    };