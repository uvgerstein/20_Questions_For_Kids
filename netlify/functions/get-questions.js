    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env; // Access the API key from Netlify's environment variables
        // Updated API URL to use gemini-1.5-flash model which is more widely available and reliable
        const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=';

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
            // Return fallback questions instead of an error
            return {
                statusCode: 200,
                body: getFallbackQuestions(ageGroup, count),
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

GOAL:
Create fun and thought-provoking questions that children can answer with one specific, correct response.

AGE GUIDELINES:
${ageSpecificInstructions}

FORMAT:
Return a valid JSON array of ${count} objects, where each object has:
- "question": a clear question in Hebrew
- "answer": one specific, correct answer
- "hint": a short clue that helps without giving the answer away

RULES:
1. Do not include the answer in the question text.
   Example to avoid: "מה שמה של בירת ישראל, ירושלים?"
2. Avoid yes/no questions.
   Example to avoid: "האם כדור הארץ עגול?"
3. Avoid vague or multi-answer questions.
   Example to avoid: "מה שמים בתוך פיתה?"
4. Use Hebrew vocabulary appropriate for age ${targetAge}.
5. Each question must have one clear, non-obvious correct answer.
6. Questions must require thinking—not guessing something obvious.
7. Phrase all questions simply and clearly.

TOPIC VARIETY:
Include a balanced mix of topics:
- Animals and nature
- Space and science
- World geography
- Famous people (Israeli and global)
- Arts and music
- Sports and games
- Food and nutrition
- Technology and transportation
- Fun facts
- Israeli culture and holidays (limit to about 25% of the questions)

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

BAD EXAMPLES (DO NOT CREATE):
- "מה שמו של דגל ישראל?" (answer is in the question)
- "איזה פרי גדל על עץ זית?" (answer is too obvious)
- "מה שמים בתוך פיתה?" (too many possible answers)
- "איזה צבע הים?" (too generic)
- "האם חנוכה הוא חג יהודי?" (yes/no question)
- "מה שם העיר שהיא בירת ישראל, ירושלים?" (answer is included)
- "מה עוזר לנו לראות בחושך?" (obvious answer: אור)
- "איזה ספורט משחקים עם כדור וסל?" (answer "כדורסל" contained in question)
- "מה שמו של המאכל העשוי מחומוס, טחינה, שמן זית ותבלינים?" (contains ingredient "חומוס" in question)

AVOID SELF-ANSWERING QUESTIONS:
- Never include a term in the question that contains the answer
- Avoid questions where the answer is directly described in the question
- Don't use obvious definitions where naming the object is the answer
- IMPORTANT: Never ask "מאיזה צמח מכינים שמן זית?" where the answer "זית" is part of "שמן זית"
- CRITICAL: If the name of the item (answer) appears anywhere in the question, the question must be rejected

ADDITIONAL EXAMPLES OF BAD QUESTIONS TO AVOID:
- "מאיזה צמח מכינים שמן זית?" (answer "זית" is part of "שמן זית")
- "מהו שמו של החג שבו מדליקים נרות בחנוכייה?" (answer "חנוכה" is part of "חנוכייה")
- "איזה פרי משמש להכנת ריבת תותים?" (answer "תות" is part of "תותים")
- "מי המציא את נורת החשמל?" (answer is implied from the definition)

FORMAT REQUIREMENTS:
- Generate all ${count} questions FIRST, then review each one
- For each question, verify the answer is NOT contained within the question text
- If the question contains any part of the answer, REPLACE IT with a better question
`;

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
                // Add timeout to prevent long-running requests
                timeout: 25000 // 25 second timeout
            });

            if (!response.ok) {
                const errorBodyText = await response.text();
                console.error('Gemini API request failed:', response.status, errorBodyText);
                
                // Return fallback questions instead of an error
                return {
                    statusCode: 200,
                    body: getFallbackQuestions(ageGroup, count),
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
                
                // Return fallback questions
                return {
                    statusCode: 200,
                    body: getFallbackQuestions(ageGroup, count),
                    headers: { 'Content-Type': 'application/json' },
                };
            }

            // Remove potential markdown code block fences if the API returns them
            questionsJsonString = questionsJsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');

            // Log that we received a successful response
            console.log(`Successfully generated ${count} questions for age group ${ageGroup}`);

            try {
                // Parse the JSON string to validate it
                const parsedQuestions = JSON.parse(questionsJsonString);
                if (!Array.isArray(parsedQuestions)) {
                    throw new Error("Response is not a valid array");
                }
                
                // Return the valid JSON string
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: questionsJsonString, // Send the string directly
                };
            } catch (parseError) {
                console.error("Failed to parse Gemini API response as JSON:", parseError, "Raw response:", questionsJsonString);
                
                // Return fallback questions
                return {
                    statusCode: 200,
                    body: getFallbackQuestions(ageGroup, count),
                    headers: { 'Content-Type': 'application/json' },
                };
            }

        } catch (error) {
            console.error('Error in Netlify function while fetching from Gemini API:', error);
            
            // Return fallback questions instead of an error
            return {
                statusCode: 200,
                body: getFallbackQuestions(ageGroup, count),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    };

    // Function to get fallback questions based on age group
    function getFallbackQuestions(ageGroup, count) {
        let fallbackQuestions = [];
        
        if (ageGroup === "5-6") {
            fallbackQuestions = [
                { question: "איזו חיה אומרת 'מיאו'?", answer: "חתול", hint: "חיית מחמד פופולרית." },
                { question: "איזה צבע השמיים ביום בהיר?", answer: "כחול", hint: "צבע חשוב בדגל ישראל." },
                { question: "מה האות הראשונה בא-ב?", answer: "א", hint: "האות הראשונה באלפבית." },
                { question: "איזה צבע העגבנייה הבשלה?", answer: "אדום", hint: "הצבע של אש." },
                { question: "איזו חיה אוהבת לאכול גזר?", answer: "ארנב", hint: "חיה עם אוזניים ארוכות." },
                { question: "כמה ימים יש בשבוע?", answer: "שבעה", hint: "אחרי שישה מגיע..." },
                { question: "איזה חג מדליקים בו נרות במשך שמונה ימים?", answer: "חנוכה", hint: "חוגגים בחורף עם סופגניות." },
                { question: "איזו חיה היא מלכת החיות?", answer: "אריה", hint: "חיה עם רעמה גדולה." },
                { question: "איזה פרי צהוב וארוך?", answer: "בננה", hint: "קוף אוהב לאכול אותו." },
                { question: "מה הצבע של העשב?", answer: "ירוק", hint: "הצבע של העלים בעצים." },
                { question: "מאיזה צבע הלימון?", answer: "צהוב", hint: "הצבע של השמש." },
                { question: "איזו חיה נותנת לנו חלב?", answer: "פרה", hint: "חיה שאומרת מו." }
            ];
        } else if (ageGroup === "7-8") {
            fallbackQuestions = [
                { question: "מה בירת צרפת?", answer: "פריז", hint: "יש בה מגדל מפורסם." },
                { question: "איזו חיה היא מלך החיות?", answer: "אריה", hint: "יש לו רעמה גדולה." },
                { question: "כמה צבעים יש בקשת?", answer: "שבעה", hint: "כמו מספר ימי השבוע." },
                { question: "מה שם ההר הגבוה בעולם?", answer: "אוורסט", hint: "נמצא בהימלאיה." },
                { question: "איזו חיה יש לה החדק הכי ארוך?", answer: "פיל", hint: "החיה היבשתית הגדולה ביותר." },
                { question: "באיזה חג מתחפשים?", answer: "פורים", hint: "אוכלים בו אוזני המן." },
                { question: "מה הצבע שמתקבל כשמערבבים צהוב וכחול?", answer: "ירוק", hint: "הצבע של העלים." },
                { question: "כמה שחקנים יש בקבוצת כדורגל?", answer: "אחד עשר", hint: "עשרה ועוד אחד." },
                { question: "באיזה חג אוכלים מצות?", answer: "פסח", hint: "חג האביב וחג החירות." },
                { question: "מה החג הראשון בשנה העברית?", answer: "ראש השנה", hint: "אוכלים בו תפוח בדבש." },
                { question: "מה הוא כוכב הלכת הקרוב ביותר לשמש?", answer: "כוכב חמה", hint: "הכוכב החם ביותר." },
                { question: "כמה רגליים יש לעכביש?", answer: "שמונה", hint: "יותר מחרק רגיל." }
            ];
        } else {
            fallbackQuestions = [
                { question: "כמה יבשות יש בעולם?", answer: "שבע", hint: "אסיה, אפריקה, אמריקה הצפונית, אמריקה הדרומית, אנטארקטיקה, אירופה, ואוסטרליה." },
                { question: "מהו כוח המושך חפצים כלפי מטה?", answer: "כוח הכבידה", hint: "כוח שמושך את התפוח מהעץ לאדמה." },
                { question: "מי כתב את 'הארי פוטר'?", answer: "ג'יי קיי רולינג", hint: "סופרת בריטית." },
                { question: "מהו החומר הנפוץ ביותר בקרום כדור הארץ?", answer: "חמצן", hint: "גז שאנחנו נושמים." },
                { question: "ממה עשוי היהלום?", answer: "פחמן", hint: "יסוד שנמצא גם בעיפרון." },
                { question: "מי הייתה ראש הממשלה הראשונה של ישראל?", answer: "גולדה מאיר", hint: "האישה היחידה שכיהנה בתפקיד זה." },
                { question: "מהי מערכת השמש החיצונית הקרובה ביותר לכדור הארץ?", answer: "פרוקסימה קנטאורי", hint: "כוכב לכת שמרוחק 4.2 שנות אור." },
                { question: "מה קרה במלחמת ששת הימים?", answer: "ישראל כבשה את סיני, רמת הגולן, יהודה ושומרון וירושלים המזרחית", hint: "מלחמה שהתרחשה ב-1967." },
                { question: "מה המספר האטומי של מימן?", answer: "אחד", hint: "המספר הראשון." },
                { question: "מה שמו של הים המלוח ביותר בעולם?", answer: "ים המלח", hint: "נמצא בישראל ובירדן." },
                { question: "איזה אלמנט הוא הנפוץ ביותר ביקום?", answer: "מימן", hint: "החומר שממנו עשויים כוכבים." },
                { question: "מי היה מנהיג תנועת אי-האלימות בהודו?", answer: "מהטמה גנדי", hint: "הוביל את מאבק העצמאות של הודו." }
            ];
        }
        
        // Ensure we return the requested count of questions (or all available if less)
        return JSON.stringify(fallbackQuestions.slice(0, count));
    }