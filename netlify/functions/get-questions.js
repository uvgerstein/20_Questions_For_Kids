    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env; // Access the API key from Netlify's environment variables
        // Updated API URL to use gemini-2.0-flash model instead of gemini-pro
        const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=';

        // Get count from query parameters
        const count = event.queryStringParameters && event.queryStringParameters.count
                      ? parseInt(event.queryStringParameters.count)
                      : 12; // Default to 12 questions
                      
        // Get age group from query parameters
        const ageGroup = event.queryStringParameters && event.queryStringParameters.ageGroup
                      ? event.queryStringParameters.ageGroup
                      : "5-6"; // Default to youngest age group

        if (!GEMINI_API_KEY) {
            console.error("Gemini API Key is not set in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "API Key not configured on the server." }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
        
        // Create different prompts based on age group
        let ageSpecificInstructions = "";
        let targetAge = "";
        
        if (ageGroup === "5-6") {
            targetAge = "5-6";
            ageSpecificInstructions = `
INSTRUCTIONS FOR 5-6 YEAR OLDS:
- Use VERY simple vocabulary and short sentences
- Focus on basic concepts like colors, animals, shapes, numbers
- Questions should be extremely straightforward
- Keep answers to single words or very short phrases
- Focus on things children can easily observe in their daily lives
- Avoid abstract concepts entirely
- Use familiar contexts like home, kindergarten, and family`;
        } else if (ageGroup === "7-8") {
            targetAge = "7-8";
            ageSpecificInstructions = `
INSTRUCTIONS FOR 7-8 YEAR OLDS:
- Use simple vocabulary but can include some challenge words
- Include basic science and geography concepts
- Questions can require some general knowledge 
- Answers can be short phrases or simple sentences
- Include some "why" and "how" questions that develop reasoning
- Focus on concrete rather than abstract concepts
- Introduce some simple historic facts and figures`;
        } else if (ageGroup === "9-10") {
            targetAge = "9-10";
            ageSpecificInstructions = `
INSTRUCTIONS FOR 9-10 YEAR OLDS:
- Use more advanced vocabulary appropriate for this age
- Include more complex science, history, and geography
- Questions should be challenging and thought-provoking
- Answers can be more detailed, including multiple concepts
- Include "what would happen if" type questions
- Introduce more abstract concepts appropriate for this age
- Include questions that require reasoning and critical thinking
- Add some questions about current events (suitable for children)`;
        }

        const promptText = `Generate ${count} high-quality, educational trivia questions in Hebrew for Israeli children ages ${targetAge}. 

CRITICAL RULES FOR QUALITY QUESTIONS:
1. NEVER include the answer within the question itself
2. NEVER create questions with obvious answers
3. AVOID tautological questions where the answer is implied in the question
4. AVOID questions with many possible correct answers (like "מה שמים בתוך פיתה?")
5. ENSURE each question has ONE clear, specific correct answer
6. CREATE genuinely challenging but age-appropriate questions
7. USE simple Hebrew vocabulary suitable for ${targetAge} year olds
8. AVOID yes/no questions entirely

${ageSpecificInstructions}

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
6. Are phrased clearly and simply for ${targetAge} year olds`;

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

            // Log that we're sending a request for a specific age group
            console.log(`Sending request to Gemini API for age group: ${ageGroup}`);

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

            // Log that we received a successful response
            console.log(`Successfully generated ${count} questions for age group ${ageGroup}`);

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