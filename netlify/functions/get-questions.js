    // netlify/functions/get-questions.js
    const fetch = require('node-fetch'); // Netlify functions run in a Node.js environment

    exports.handler = async function(event, context) {
        const { GEMINI_API_KEY } = process.env;
        
        console.log("API Key available:", !!GEMINI_API_KEY); // Don't log the actual key
        
        // Try multiple endpoints
        const endpoints = [
            {
                name: "Google AI Studio API",
                url: `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
            },
            {
                name: "Vertex AI",
                url: `https://us-central1-aiplatform.googleapis.com/v1/projects/gersteinart-sizes/locations/us-central1/publishers/google/models?key=${GEMINI_API_KEY}`
            }
        ];
        
        const results = {};
        
        for (const endpoint of endpoints) {
            try {
                console.log(`Trying ${endpoint.name} endpoint...`);
                const response = await fetch(endpoint.url);
                const status = response.status;
                
                results[endpoint.name] = {
                    status,
                    ok: response.ok
                };
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`${endpoint.name} successful response:`, JSON.stringify(data).substring(0, 200) + "...");
                    results[endpoint.name].data = "Data retrieved successfully";
                } else {
                    const errorText = await response.text();
                    console.error(`${endpoint.name} error:`, status, errorText);
                    results[endpoint.name].error = errorText;
                }
            } catch (error) {
                console.error(`${endpoint.name} fetch error:`, error.message);
                results[endpoint.name] = {
                    error: error.message
                };
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "API diagnostics complete",
                results
            })
        };
    };