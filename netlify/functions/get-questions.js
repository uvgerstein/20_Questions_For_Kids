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

CRITICAL RULES FOR QUALITY QUESTIONS:
1. NEVER include the answer within the question itself
2. NEVER create questions with obvious answers
3. AVOID tautological questions where the answer is implied in the question
4. AVOID questions with many possible correct answers (like "מה שמים בתוך פיתה?")
5. ENSURE each question has ONE clear, specific correct answer
6. CREATE genuinely challenging but age-appropriate questions
7. USE simple Hebrew vocabulary suitable for 5-8 year olds
8. AVOID yes/no questions entirely

TOPIC VARIETY:
Include a balanced mix of topics, not just Israel-specific content:
- Science (animals, space, human body, nature)
- General knowledge (colors, shapes, numbers)
- World geography and landmarks (not just Israeli)
- Famous people from history and present
- Arts and music
- Sports and games
- Fun facts and "Did you know?" type information
- Transportation and technology
- Food and nutrition from around the world
- Some Israeli culture and holidays (but limit to about 1/4 of questions)

Format the output as a valid JSON array of objects, where each object has "question", "answer", and "hint" keys.

GOOD EXAMPLES:
[
  {
    "question": "איזה חיה היא הגדולה ביותר בעולם?",
    "answer": "לוויתן כחול",
    "hint": "חיה שחיה באוקיינוס"
  },
  {
    "question": "כמה רגליים יש לעכביש?",
    "answer": "שמונה",
    "hint": "מספר שבא אחרי שבע"
  },
  {
    "question": "איזה כוכב לכת הוא הקרוב ביותר לשמש?",
    "answer": "כוכב חמה",
    "hint": "הכוכב החם ביותר במערכת השמש"
  }
]

BAD EXAMPLES (DO NOT CREATE QUESTIONS LIKE THESE):
- "מה שמו של דגל ישראל?" (contains answer in question)
- "איזה פרי גדל על עץ זית?" (the answer "זית" is too obvious from the question)
- "מה שמים בתוך פיתה?" (too many possible answers: פלאפל, חומוס, סלט, וכו׳)
- "איזה צבע הים?" (too obvious and generic)
- "האם חנוכה הוא חג יהודי?" (yes/no question)
- "מה שם העיר שהיא בירת ישראל, ירושלים?" (reveals answer)

Make sure all ${count} questions:
1. Are genuinely educational 
2. Require thinking by the child
3. Have ONE specific, non-obvious correct answer
4. Don't contain or imply their answers
5. Cover a variety of topics - not just Israeli culture
6. Are phrased clearly and simply`;

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