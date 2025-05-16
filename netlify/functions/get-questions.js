    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env;
        
        // Using gemini-1.5-flash model
        const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
        const count = event.queryStringParameters?.count || 12;

        // Refined prompt for age-appropriate questions for Israeli children
        const prompt = `Generate ${count} interesting trivia questions IN HEBREW for Israeli children ages 5-8.

        Topics should include:
        - Age-appropriate science facts (space, animals, nature)
        - Israeli geography, landmarks, and culture
        - Fun facts about the world
        - Basic history
        - Sports and games popular in Israel
        
        AVOID overly simple questions like "what is a toothbrush?" or very basic object identification.
        The questions should be interesting and slightly challenging but still appropriate for the age group.
        
        For each question, provide:
        1. A clear question
        2. A concise answer
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
                        temperature: 0.8, // Slightly higher temperature for more creativity
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