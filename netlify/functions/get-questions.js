    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env;
        
        // Update to use available model (gemini-1.5-flash)
        const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
        const count = event.queryStringParameters?.count || 12;

        // Create a prompt for kid-friendly questions
        const prompt = `Generate ${count} kid-friendly trivia questions. For each question, provide a question, a short answer, and a one-sentence hint. Format as JSON array with "question", "answer", and "hint" keys. Example: [{"question": "What is 2+2?", "answer": "4", "hint": "It's a small number."}]`;

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
                        temperature: 0.7,
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