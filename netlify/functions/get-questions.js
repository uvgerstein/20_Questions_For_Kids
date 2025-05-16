    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env;
        
        // Temporarily change to list available models
        const baseUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";
        const fullApiUrl = `${baseUrl}?key=${GEMINI_API_KEY}`;
        
        try {
            console.log("Attempting to list available models...");
            const response = await fetch(fullApiUrl);
            
            if (!response.ok) {
                const errorBody = await response.text();
                console.error('ListModels request failed:', response.status, errorBody);
                return { 
                    statusCode: response.status, 
                    body: JSON.stringify({ error: "Failed to list models", details: errorBody }) 
                };
            }
            
            const data = await response.json();
            console.log("Available models:", JSON.stringify(data, null, 2));
            
            // Return the list for inspection
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Models list retrieved", models: data })
            };
        } catch (error) {
            console.error("Error listing models:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to retrieve models list" })
            };
        }
    };