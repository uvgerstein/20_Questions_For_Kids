    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env;
        
        // Using gemini-1.5-flash model
        const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
        const count = event.queryStringParameters?.count || 12;

        // Enhanced prompt for high-quality, specific questions for Israeli children
        const prompt = `Generate ${count} interesting and SPECIFIC trivia questions IN HEBREW for Israeli children ages 5-8.

        Topics should include:
        - Age-appropriate science facts (space, animals, nature)
        - Israeli geography, landmarks, and culture
        - Fun facts about the world
        - Basic history
        - Sports and games popular in Israel
        
        IMPORTANT REQUIREMENTS:
        1. AVOID overly simple questions or ones with generic answers
        2. ENSURE each answer is SPECIFIC and PRECISE (not generic categories)
        3. For sports questions, ask about specific teams, players, or competitions (not just the sport itself)
        4. Questions should be challenging but age-appropriate
        5. Answers must be factually correct for Israeli context
        
        BAD EXAMPLE: 
        Question: "What is the most popular football game in Israel?" 
        Answer: "Football" (TOO GENERIC)
        
        GOOD EXAMPLE:
        Question: "What is the most popular football team in Israel?"
        Answer: "Maccabi Tel Aviv" (SPECIFIC)
        
        For each question, provide:
        1. A clear, specific question
        2. A concise, accurate, and SPECIFIC answer
        3. A helpful hint
        
        Format as a JSON array with "question", "answer", and "hint" keys.
        ALL text must be in Hebrew.
        
        Example format (but in Hebrew):
        [{"question": "Which planet is known for its beautiful rings?", "answer": "Saturn", "hint": "It's the sixth planet from the sun."}]`;

        try {
            const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7, // Slightly lower temperature for more accuracy
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024
                    }
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API request failed:', response.status, errorText);
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Extract the text response
            const text = data.candidates[0].content.parts[0].text;
            console.log("Raw API response text:", text.substring(0, 200) + "..."); // Log beginning of response
            
            // Try to parse it as JSON
            try {
                // Clean up markdown if present
                const cleanedText = text.replace(/```json\n?/g, '').replace(/\n?```/g, '');
                const questions = JSON.parse(cleanedText);
                
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(questions)
                };
            } catch (parseError) {
                console.error('Failed to parse API response as JSON:', parseError);
                console.log('Raw API response:', text);
                throw new Error('Failed to parse questions from API response');
            }
        } catch (error) {
            console.error('Error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message })
            };
        }
    };