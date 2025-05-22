    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env; // Access the API key from Netlify's environment variables
        
        // Use available models with correct names in priority order
        const GEMINI_MODELS = [
            'gemini-1.5-flash', 
            'gemini-1.5-pro',
            'gemini-pro'  // Add legacy model as last resort
        ];

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
- Use familiar contexts like home, kindergarten, and family
- Use concepts that are familiar to Israeli children at this age`;
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
- Introduce some simple historic facts and figures
- Include some Israeli-specific content appropriate for this age group`;
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
- Add some questions about current events (suitable for children)
- Include Israeli culture, geography, and historical content`;
        }

        // Adjust prompt to minimize token usage - critical when hitting quotas
        const promptText = `Generate ${count} educational trivia questions in Hebrew for Israeli children ages ${targetAge}.

AGE GUIDELINES:
${ageSpecificInstructions}

FORMAT:
Return a JSON array of ${count} objects, with "question", "answer", and "hint" fields.

RULES:
1. Do not include answers in questions
2. Avoid yes/no questions
3. Ensure one clear answer per question
4. Use age-appropriate vocabulary
5. NEVER REPEAT similar questions
6. Maximize topic diversity

JSON FORMAT EXAMPLE:
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
  }
]`;

        // Try each model in succession until one works
        let lastError = null;
        const retryDelays = [1000, 2000, 4000]; // Progressively longer delays for retries within same model
        
        modelLoop: for (const model of GEMINI_MODELS) {
            // Try each model with multiple retries using exponential backoff
            for (let retryCount = 0; retryCount <= retryDelays.length; retryCount++) {
                try {
                    // If this isn't the first attempt, wait before retrying
                    if (retryCount > 0) {
                        const delay = retryDelays[retryCount - 1];
                        console.log(`Retry #${retryCount} for ${model} after ${delay}ms delay`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    const GEMINI_API_BASE_URL = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=`;
                    const fullApiUrl = `${GEMINI_API_BASE_URL}${GEMINI_API_KEY}`;
                    
                    console.log(`Trying model: ${model} for age group: ${ageGroup}`);
                    
                    // Create generation config based on model capabilities
                    let generationConfig = {
                        temperature: 0.9,
                        topK: 80,
                        topP: 0.95,
                        maxOutputTokens: 1024, // Reduced token count to conserve quota
                    };
                    
                    // Use different settings to reduce token usage and quota consumption
                    if (model === 'gemini-pro') {
                        // Legacy model uses fewer tokens
                        generationConfig.maxOutputTokens = 800;
                        generationConfig.temperature = 0.8;
                    } else if (model === 'gemini-1.5-pro') {
                        // Pro model - keep tokens minimal
                        generationConfig.maxOutputTokens = 900;
                        generationConfig.temperature = 0.85;
                    } else if (model === 'gemini-1.5-flash') {
                        // Flash model - slightly more tokens but still conservative
                        generationConfig.maxOutputTokens = 1024;
                        generationConfig.temperature = 0.9;
                    }
                    
                    const requestBody = {
                        contents: [{
                            parts: [{
                                text: promptText
                            }]
                        }],
                        generationConfig: generationConfig
                    };

                    const response = await fetch(fullApiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                        // Shorter timeout to avoid long-running requests
                        timeout: 20000 // 20 second timeout
                    });

                    if (!response.ok) {
                        const errorBodyText = await response.text();
                        console.warn(`Model ${model} request failed:`, response.status, errorBodyText);
                        
                        // Try to parse the error response
                        let retryAfterMs = 0;
                        try {
                            const errorObj = JSON.parse(errorBodyText);
                            
                            // Check for specific error types
                            if (response.status === 429) { // Rate limit
                                console.warn(`Rate limit or quota reached for model ${model}`);
                                
                                // See if we should try retrying this model or move to next
                                const quotaError = errorObj?.error?.details?.find(
                                    d => d['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure'
                                );
                                
                                // If it's a quota issue, move to next model immediately
                                if (quotaError) {
                                    console.warn(`Quota exceeded for ${model}, moving to next model`);
                                    lastError = { status: response.status, body: errorBodyText };
                                    continue modelLoop;
                                }
                                
                                // Extract retry delay if present
                                const retryInfo = errorObj?.error?.details?.find(
                                    d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
                                );
                                
                                if (retryInfo?.retryDelay) {
                                    // Parse the retry delay value (format might be like "13s")
                                    const delayStr = retryInfo.retryDelay;
                                    const delayNum = parseInt(delayStr.replace(/[^0-9]/g, ''));
                                    
                                    if (!isNaN(delayNum)) {
                                        // Convert to milliseconds if it's in seconds
                                        retryAfterMs = delayStr.includes('s') ? delayNum * 1000 : delayNum;
                                        console.log(`API suggested retry delay: ${retryAfterMs}ms`);
                                    }
                                }
                            } else if (response.status === 503) { // Service unavailable
                                console.warn(`Model ${model} is overloaded, will retry with exponential backoff`);
                            }
                        } catch (e) {
                            // Ignore parsing errors
                            console.warn("Could not parse error response:", e);
                        }
                        
                        lastError = { status: response.status, body: errorBodyText };
                        
                        // If API gave us a specific retry time, use that instead of our backoff
                        if (retryAfterMs > 0 && retryCount < retryDelays.length) {
                            console.log(`Waiting ${retryAfterMs}ms before retrying ${model} as suggested by API`);
                            await new Promise(resolve => setTimeout(resolve, retryAfterMs));
                            // Don't increment retryCount, just try again
                            retryCount--;
                            continue;
                        }
                        
                        // If we've exhausted retries for this model, move to next one
                        if (retryCount >= retryDelays.length) {
                            console.warn(`Maximum retries (${retryDelays.length}) reached for model ${model}, trying next model`);
                            continue modelLoop;
                        }
                        
                        // Otherwise continue to next retry iteration
                        continue;
                    }

                    const data = await response.json();
                    let questionsJsonString;

                    // Extract the generated text from the model's response
                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
                        questionsJsonString = data.candidates[0].content.parts[0].text;
                    } else {
                        console.warn(`Unexpected response structure from model ${model}:`, JSON.stringify(data, null, 2));
                        // Try next retry
                        continue;
                    }

                    // Remove potential markdown code block fences if the API returns them
                    questionsJsonString = questionsJsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');

                    // Log that we received a successful response
                    console.log(`Successfully generated ${count} questions using ${model} for age group ${ageGroup}`);

                    try {
                        // Add detailed logging for debugging
                        const originalLength = questionsJsonString.length;
                        console.log(`Raw response length: ${originalLength} chars`);
                        console.log("First 200 chars of raw response:", questionsJsonString.substring(0, 200).replace(/\n/g, ' '));
                        
                        // Clean and repair potentially malformed JSON
                        questionsJsonString = cleanAndRepairJson(questionsJsonString);
                        console.log(`After repair, length: ${questionsJsonString.length} chars`);
                        
                        // Parse the JSON string to validate it
                        let parsedQuestions = [];
                        try {
                            parsedQuestions = JSON.parse(questionsJsonString);
                            if (!Array.isArray(parsedQuestions)) {
                                console.warn("Parsed result is not an array, trying to fix");
                                // If we got a single object, wrap it in an array
                                if (typeof parsedQuestions === 'object') {
                                    parsedQuestions = [parsedQuestions];
                                } else {
                                    throw new Error("Response is not a valid array or object");
                                }
                            }
                        } catch (parseError) {
                            console.error("JSON parse error after repair:", parseError);
                            // Move to next model if parsing fails
                            continue modelLoop;
                        }
                        
                        console.log(`Parsed ${parsedQuestions.length} questions from JSON`);
                        
                        // Validate questions and fill in missing fields if necessary
                        const validQuestions = parsedQuestions.filter(q => {
                            // Basic structure validation
                            if (!q || typeof q !== 'object') return false;
                            
                            // Ensure essential fields exist
                            if (!q.question || !q.answer) {
                                console.warn("Skipping question with missing fields:", JSON.stringify(q).substring(0, 100));
                                return false;
                            }
                            
                            // Add hint if missing
                            if (!q.hint && q.question && q.answer) {
                                console.log("Adding missing hint for question:", q.question.substring(0, 30));
                                q.hint = "רמז לא זמין";
                            }
                            
                            return true;
                        });
                        
                        console.log(`Validated ${validQuestions.length} questions with required fields`);
                        
                        // If we have fewer than minimum questions, retry with next model
                        if (validQuestions.length < Math.min(5, count)) {
                            console.warn(`Insufficient questions (${validQuestions.length}) from model ${model}, trying next model`);
                            continue modelLoop;
                        }
                        
                        // Add signature tracking for question diversity
                        validQuestions.forEach(q => {
                            // Create a simplified signature from the question to track for repeats
                            q.signature = q.question
                                .replace(/[.,?!;:'"()\[\]{}]/g, '') // Remove punctuation
                                .toLowerCase()
                                .split(' ')
                                .filter(word => word.length > 3) // Keep only meaningful words
                                .sort()
                                .join('|'); // Create a sorted signature
                        });
                        
                        console.log(`✓ SUCCESS: Generated ${validQuestions.length} unique questions for age group ${ageGroup}`);
                        
                        // Return the valid JSON string with metadata
                        return {
                            statusCode: 200,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                questions: validQuestions,
                                meta: {
                                    source: 'generated',
                                    model: model,
                                    ageGroup: ageGroup,
                                    timestamp: new Date().toISOString(),
                                    requested: count,
                                    received: validQuestions.length,
                                    repaired: originalLength !== questionsJsonString.length
                                }
                            }),
                        };
                    } catch (parseError) {
                        console.error(`Failed to process ${model} response:`, parseError);
                        // Save error details for diagnosis
                        console.error("Response sample:", questionsJsonString ? questionsJsonString.substring(0, 300) : "empty");
                        // Continue with next retry
                        continue;
                    }
                } catch (modelError) {
                    console.warn(`Error with model ${model} (attempt ${retryCount+1}):`, modelError);
                    lastError = modelError;
                    
                    // If this is a network or timeout error, retry with backoff
                    // If we've exhausted retries, move to next model
                    if (retryCount >= retryDelays.length) {
                        continue modelLoop;
                    }
                }
            }
        }
        
        // If we get here, all models failed
        console.error('All Gemini models failed to generate questions.', lastError);
        
        // Return fallback questions instead of an error
        console.log('⚠️ FALLBACK: Using pre-defined fallback questions for age group', ageGroup);
        const fallbackQuestionsJson = getFallbackQuestions(ageGroup, count);
        const fallbackQuestions = JSON.parse(fallbackQuestionsJson);
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questions: fallbackQuestions,
                meta: {
                    source: 'fallback',
                    ageGroup: ageGroup,
                    timestamp: new Date().toISOString(),
                    reason: lastError ? `API error: ${lastError.status || 'unknown'}` : 'API key missing'
                }
            }),
        };
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
                { question: "איזו חיה נותנת לנו חלב?", answer: "פרה", hint: "חיה שאומרת מו." },
                // Adding more varied questions
                { question: "איזה כלי נגינה יש לו מיתרים?", answer: "גיטרה", hint: "מנגנים עליו עם האצבעות." },
                { question: "איזה צורה יש למגן דוד?", answer: "כוכב", hint: "יש לו שישה קודקודים." },
                { question: "מה בא אחרי היום?", answer: "לילה", hint: "כשחשוך בחוץ." },
                { question: "כמה אצבעות יש לנו בשתי הידיים יחד?", answer: "עשר", hint: "חמש ועוד חמש." },
                { question: "מי מלמד בבית הספר?", answer: "מורה", hint: "האדם שעומד ליד הלוח." },
                { question: "איזה חיה יודעת לעוף?", answer: "ציפור", hint: "יש לה כנפיים." },
                { question: "כמה עונות יש בשנה?", answer: "ארבע", hint: "קיץ, סתיו, חורף ו..." },
                { question: "מה צומח על עצים?", answer: "פירות", hint: "אוכלים אותם וטעימים." }
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
                { question: "כמה רגליים יש לעכביש?", answer: "שמונה", hint: "יותר מחרק רגיל." },
                // Adding more varied questions
                { question: "מה תפקידו של הלב בגוף?", answer: "להזרים דם", hint: "הוא פועם כל הזמן." },
                { question: "איזה יבשת היא הגדולה ביותר?", answer: "אסיה", hint: "סין והודו נמצאות שם." },
                { question: "מי המציא את הטלפון?", answer: "אלכסנדר גרהם בל", hint: "המצאה מלפני כ-150 שנה." },
                { question: "מי כתב את הספר 'הארי פוטר'?", answer: "ג'יי קיי רולינג", hint: "סופרת בריטית." },
                { question: "איזה חומר עשוי מחול?", answer: "זכוכית", hint: "שקוף ושביר." },
                { question: "מה שמו של הים בין ישראל למצרים?", answer: "ים סוף", hint: "ים עם שונית אלמוגים." },
                { question: "מה המספר הגדול ביותר בלוח הכפל?", answer: "מאה", hint: "עשר כפול עשר." },
                { question: "באיזה אמצעי תחבורה משתמשים לטיסה לחלל?", answer: "חללית", hint: "כלי שטס מעבר לאטמוספרה." }
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
                { question: "מי היה מנהיג תנועת אי-האלימות בהודו?", answer: "מהטמה גנדי", hint: "הוביל את מאבק העצמאות של הודו." },
                // Adding more varied questions
                { question: "מהי הנוסחה הכימית של מים?", answer: "H2O", hint: "שני מימנים ואחד חמצן." },
                { question: "מיהו הצייר שצייר את המונה ליזה?", answer: "לאונרדו דה וינצ'י", hint: "ממציא וצייר איטלקי מהרנסאנס." },
                { question: "איזה מטבע משתמשים ברוב מדינות אירופה?", answer: "אירו", hint: "מטבע משותף לאיחוד האירופאי." },
                { question: "איזה כלי נגינה יש לו 88 מקשים?", answer: "פסנתר", hint: "כלי נגינה קלאסי עם מקשים שחורים ולבנים." },
                { question: "באיזה שנה הוקמה מדינת ישראל?", answer: "1948", hint: "לפני יותר מ-70 שנה." },
                { question: "מה תפקיד הכלורופיל בצמחים?", answer: "לבצע פוטוסינתזה", hint: "החומר שנותן לצמחים את הצבע הירוק." },
                { question: "מהי היחידה הבסיסית של תורשה?", answer: "גן", hint: "מכיל מידע גנטי שעובר מהורים לילדים." },
                { question: "איזה חומר משמש כדלק בתחנות כוח גרעיניות?", answer: "אורניום", hint: "יסוד רדיואקטיבי." }
            ];
        }
        
        // Ensure we return the requested count of questions (or all available if less)
        // Shuffle the array to ensure variety
        const shuffled = fallbackQuestions.sort(() => 0.5 - Math.random());
        
        // Add signature to each question for tracking
        shuffled.forEach(q => {
            q.signature = q.question
                .replace(/[.,?!;:'"()\[\]{}]/g, '') // Remove punctuation
                .toLowerCase()
                .split(' ')
                .filter(word => word.length > 3) // Keep only meaningful words
                .sort()
                .join('|'); // Create a sorted signature
        });
        
        return JSON.stringify(shuffled.slice(0, count));
    }

    // Function to clean and repair malformed JSON
    function cleanAndRepairJson(jsonString) {
        if (!jsonString) {
            console.error("Empty JSON string received");
            return '[]';
        }
        
        // Log a sample for debugging
        console.log("JSON sample (first 200 chars):", jsonString.substring(0, 200).replace(/\n/g, ' ').trim() + '...');
        
        try {
            // Step 1: Check if it's already valid JSON
            try {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log("JSON is already valid with", parsed.length, "items");
                    return jsonString;
                }
            } catch (e) {
                console.log("Initial JSON parse failed, starting repair process");
            }
            
            // Step 2: Basic cleanup before processing
            // Remove markdown code blocks
            jsonString = jsonString.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
            
            // Step 3: Clean specific Hebrew/JSON issues
            // Remove non-standard quotes and replace with standard ones
            jsonString = jsonString.replace(/[״""„'']/g, '"');
            
            // Replace RTL/LTR markers that might break JSON
            jsonString = jsonString.replace(/[\u200E\u200F\u202A-\u202E]/g, '');
            
            // Fix common spacing issues
            jsonString = jsonString.replace(/\s+/g, ' ');
            
            // Ensure the string starts with [ and ends with ]
            jsonString = jsonString.trim();
            if (!jsonString.startsWith('[')) jsonString = '[' + jsonString;
            if (!jsonString.endsWith(']')) jsonString = jsonString + ']';
            
            // Step 4: Attempt more structural repairs
            // Fix missing quotes around property names
            jsonString = jsonString.replace(/{\s*([a-zA-Z0-9_]+)\s*:/g, '{"$1":');
            
            // Fix missing commas between objects
            jsonString = jsonString.replace(/}\s*{/g, '},{');
            
            // Fix trailing commas in arrays
            jsonString = jsonString.replace(/,\s*]/g, ']');
            
            // Try parsing again after these repairs
            try {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log("JSON repaired successfully with", parsed.length, "items");
                    return jsonString;
                }
            } catch (e) {
                console.log("Basic repairs were not enough, continuing with deeper fixes");
            }
            
            // Step 5: More aggressive line-by-line repair
            const lines = jsonString.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Count quotes to find unbalanced quotes
                const quoteCount = (line.match(/"/g) || []).length;
                if (quoteCount % 2 === 1) {
                    if (i < lines.length - 1) {
                        // Try to fix by adding a closing quote
                        lines[i] = line + '"';
                    }
                }
                
                // Fix common Hebrew JSON issues (missing quotes, extra characters)
                lines[i] = lines[i]
                    .replace(/([{,]\s*)([א-ת\w]+)(\s*:)/g, '$1"$2"$3') // Add quotes around Hebrew property names
                    .replace(/:(\s*)([^",\s][^",}]*?)(\s*[,}])/g, ':"$2"$3'); // Add quotes around unquoted string values
            }
            jsonString = lines.join('\n');
            
            // Try parsing after aggressive fixes
            try {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log("JSON repaired through line-by-line processing with", parsed.length, "items");
                    return jsonString;
                }
            } catch (e) {
                console.log("Line repairs failed, attempting object extraction", e.message);
            }
            
            // Step 6: Direct regex extraction of question objects
            console.log("Extracting objects from malformed JSON...");
            const extractedQuestions = [];
            
            // Search for complete objects
            // This regex looks for objects containing question and answer fields
            const objectPattern = /{([^{}]|(?:\{[^{}]*\}))*"question"[^{}]*"answer"[^{}]*}/g;
            let match;
            
            while ((match = objectPattern.exec(jsonString)) !== null) {
                try {
                    let objStr = match[0];
                    
                    // Perform repairs on the individual object
                    objStr = objStr
                        .replace(/([{,]\s*)([א-ת\w]+)(\s*:)/g, '$1"$2"$3') // Fix property names
                        .replace(/:(\s*)([^",\s][^",}]*?)(\s*[,}])/g, ':$1"$2"$3') // Fix unquoted values
                        .replace(/"\s*:\s*"/g, '":"') // Normalize spacing
                        .replace(/",\s*}/g, '"}'); // Fix trailing commas
                    
                    // Try to parse this object
                    const obj = JSON.parse(objStr);
                    if (obj && obj.question && obj.answer) {
                        if (!obj.hint) {
                            obj.hint = "רמז לא זמין"; // Default hint in Hebrew
                        }
                        extractedQuestions.push(obj);
                        console.log(`Extracted question: "${obj.question.substring(0, 30)}..."`);
                    }
                } catch (objErr) {
                    console.warn("Failed to parse extracted object:", match[0].substring(0, 50) + "...");
                }
            }
            
            if (extractedQuestions.length > 0) {
                console.log(`Successfully extracted ${extractedQuestions.length} complete questions`);
                return JSON.stringify(extractedQuestions);
            }
            
            // Step 7: Last resort - extract individual fields and reconstruct
            console.log("Attempting field extraction as last resort");
            
            // Extract individual fields
            const questions = [];
            const answersByQuestion = new Map();
            const hintsByQuestion = new Map();
            
            // These regexes find field values even in malformed JSON
            // Looking for "question": "value" patterns
            const questionRegex = /"question"\s*:\s*"([^"]+)"/g;
            const answerRegex = /"answer"\s*:\s*"([^"]+)"/g;  
            const hintRegex = /"hint"\s*:\s*"([^"]+)"/g;
            
            // Extract all question field values
            while ((match = questionRegex.exec(jsonString)) !== null) {
                const questionText = match[1].trim();
                if (questionText.length > 5) { // Only consider non-trivial questions
                    questions.push(questionText);
                }
            }
            
            // Extract all answer field values
            while ((match = answerRegex.exec(jsonString)) !== null) {
                // Get nearby question for this answer if possible
                const answerText = match[1].trim();
                const pos = match.index;
                
                // Find closest question by position
                let closestQuestion = null;
                let minDistance = Infinity;
                
                for (const q of questions) {
                    const qPos = jsonString.indexOf(q);
                    if (qPos !== -1) {
                        const distance = Math.abs(pos - qPos);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestQuestion = q;
                        }
                    }
                }
                
                if (closestQuestion && minDistance < 500) { // Only associate if reasonably close
                    answersByQuestion.set(closestQuestion, answerText);
                }
            }
            
            // Extract all hint field values
            while ((match = hintRegex.exec(jsonString)) !== null) {
                // Get nearby question for this hint
                const hintText = match[1].trim();
                const pos = match.index;
                
                // Find closest question by position
                let closestQuestion = null;
                let minDistance = Infinity;
                
                for (const q of questions) {
                    const qPos = jsonString.indexOf(q);
                    if (qPos !== -1) {
                        const distance = Math.abs(pos - qPos);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestQuestion = q;
                        }
                    }
                }
                
                if (closestQuestion && minDistance < 500) { // Only associate if reasonably close
                    hintsByQuestion.set(closestQuestion, hintText);
                }
            }
            
            // Create complete question objects
            const reconstructedQuestions = [];
            
            for (const questionText of questions) {
                if (answersByQuestion.has(questionText)) {
                    reconstructedQuestions.push({
                        question: questionText,
                        answer: answersByQuestion.get(questionText),
                        hint: hintsByQuestion.has(questionText) 
                            ? hintsByQuestion.get(questionText) 
                            : "רמז לא זמין"
                    });
                }
            }
            
            if (reconstructedQuestions.length > 0) {
                console.log(`Successfully reconstructed ${reconstructedQuestions.length} questions from fields`);
                return JSON.stringify(reconstructedQuestions);
            }
            
            // If we've tried everything and failed, simply extract anything that looks like a question
            const lastChanceQuestions = [];
            // Just grab anything with question: and answer: patterns
            const lastChanceRegex = /"question"\s*:\s*"([^"]+)"[^}]*"answer"\s*:\s*"([^"]+)"/g;
            
            while ((match = lastChanceRegex.exec(jsonString)) !== null) {
                lastChanceQuestions.push({
                    question: match[1].trim(),
                    answer: match[2].trim(),
                    hint: "רמז לא זמין"
                });
            }
            
            if (lastChanceQuestions.length > 0) {
                console.log(`Last chance extraction found ${lastChanceQuestions.length} questions`);
                return JSON.stringify(lastChanceQuestions);
            }
            
            // Truly nothing worked
            console.error("All JSON repair methods failed, returning empty array");
            console.error("Sample of problematic JSON:", jsonString.substring(0, 500));
            return '[]';
        } catch (e) {
            console.error("Error in JSON repair function:", e);
            return '[]';
        }
    }