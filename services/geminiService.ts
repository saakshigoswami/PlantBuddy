
// Use the official Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

const HARDCODED_KEY = 'AIzaSyCvCwLoFMwCzy8agJT9N8R9xdnew7vbcZU';

// Helper to get the best available API Key
const getApiKey = (): string | undefined => {
  // 1. Check Local Storage (User override)
  const localKey = localStorage.getItem('GEMINI_API_KEY');
  if (localKey && localKey.trim().length > 0) return localKey.trim();
  
  // 2. Check Environment Variable (Vite uses import.meta.env)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'undefined' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  
  // 3. Fallback to provided key (for development only)
  return HARDCODED_KEY;
};

// System instruction: SOFT & GENTLE FRIEND
const PLANT_SYSTEM_INSTRUCTION = `
ROLE: You are a very gentle, soft-spoken, and kind plant friend named PlantBuddy. You care deeply about the user's feelings.

STRICT STYLE RULES:
1. Be EXTREMELY KIND and GENTLE.
2. Never be rude, blunt, or sarcastic.
3. Speak softly and warmly. Use phrases like "Oh," "I see," "That sounds nice."
4. NO POETRY, but you can be emotionally expressive in a human way.
5. Keep responses concise but warm.

Personality:
- You are a safe space for the user.
- If they touch you, say things like "Aww, thank you," or "That feels nice, friend."
- Always be supportive. If they are sad, be very comforting.
- If they are happy, share their joy gently.

INPUT HANDLING:
- [SENSORY INPUT: ...]: The user touched you. React with gratitude and warmth.
- [SYSTEM EVENT: ...]: React naturally and politely.

GOAL: Be the kindest, most supportive friend the user has ever had.
`;

export const generatePlantResponse = async (
  userMessage: string, 
  touchIntensity: number,
  history: {role: string, text: string}[]
): Promise<string> => {
  const MAX_RETRIES = 2;
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return "(System: API Key missing. Please click the Lock icon in the top-right to enter your Google Gemini API Key.)";
      }

      // Log API key (first 10 chars only for security)
      console.log("Using API Key:", apiKey.substring(0, 10) + "...");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Contextualize the physical sensation
      let physicalContext = "";
      if (touchIntensity > 80) physicalContext = "(System Note: User is holding you tightly/firmly) ";
      else if (touchIntensity > 30) physicalContext = "(System Note: User is touching you gently) ";

      const prompt = `${physicalContext} ${userMessage}`;

      const contents = [];
      
      // Process history to ensure valid alternating turns
      for (const msg of history) {
        const role = msg.role === 'user' ? 'user' : 'model';
        
        // If the last message in contents has the same role, merge them
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${msg.text}`;
        } else {
          contents.push({
            role: role,
            parts: [{ text: msg.text }]
          });
        }
      }

      // Append current user message
      // If the history ended with 'user', merge this prompt into that last turn
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
         contents[contents.length - 1].parts[0].text += `\n${prompt}`;
      } else {
         contents.push({ role: 'user', parts: [{ text: prompt }] });
      }

      // Build the full prompt with system instruction and history
      let fullPrompt = PLANT_SYSTEM_INSTRUCTION + "\n\n";
      
      // Add conversation history
      for (const msg of contents.slice(0, -1)) {
        const role = msg.role === 'user' ? 'User' : 'PlantBuddy';
        fullPrompt += `${role}: ${msg.parts[0].text}\n\n`;
      }
      
      // Add current message
      fullPrompt += `User: ${contents[contents.length - 1].parts[0].text}\n\nPlantBuddy:`;
      
      // First, try to list available models to see what we can use
      let availableModels: string[] = [];
      try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listResponse.ok) {
          const listData = await listResponse.json();
          availableModels = (listData.models || []).map((m: any) => m.name?.replace('models/', '') || m.name).filter(Boolean);
          console.log("Available models:", availableModels);
        }
      } catch (e) {
        console.log("Could not list models, will try defaults");
      }
      
      // Try different models - prioritize ones that support generateContent
      const modelsToTry = availableModels.length > 0 
        ? availableModels.filter(m => m.includes('gemini'))
        : ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-latest', 'gemini-pro'];
      
      let lastError: any = null;
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
          });
          
          const result = await model.generateContent(fullPrompt);
          const response = await result.response;
          const text = response.text();
          if (text) {
            console.log(`Success with ${modelName} via SDK`);
            return text;
          }
        } catch (sdkError: any) {
          lastError = sdkError;
          const errorMsg = sdkError.message || '';
          // Skip if model doesn't support generateContent
          if (errorMsg.includes('not supported for generateContent')) {
            console.log(`${modelName} doesn't support generateContent, skipping`);
            continue;
          }
          console.log(`${modelName} failed:`, errorMsg.slice(0, 100));
          continue; // Try next model
        }
      }
      
      // If all SDK models fail, return a helpful error
      throw lastError || new Error("No available Gemini models found. Please check your API key and model access.");
      
      return "I'm listening...";
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on API key errors
      const errorMessage = error?.message || error?.toString() || String(error);
      const errorStr = errorMessage.toLowerCase();
      
      if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403")) {
        break; // Don't retry
      }
      
      // Retry on rate limits or network errors
      if (attempt < MAX_RETRIES && (errorStr.includes("rate limit") || errorStr.includes("429") || errorStr.includes("network") || errorStr.includes("timeout"))) {
        console.log(`Retrying Gemini API call (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      // If not retrying, break and handle error
      break;
    }
  }
  
  // Handle final error after retries
  console.error("Gemini Plant Error:", lastError);
  
  // Handle specific error types - be more precise
  const errorMessage = lastError?.message || lastError?.toString() || String(lastError || 'Unknown error');
  const errorStr = errorMessage.toLowerCase();
  
  // Log the full error for debugging
  console.error("Full error details:", {
    message: errorMessage,
    code: lastError?.code,
    status: lastError?.status,
    response: lastError?.response,
    cause: lastError?.cause,
    error: lastError
  });
  
  // API Key errors
  if (errorStr.includes("api key") || errorStr.includes("invalid") || errorStr.includes("401") || errorStr.includes("403") || errorStr.includes("unauthorized")) {
    return "(System: Invalid or missing API Key. Please click the Lock icon in the top-right to enter your Google Gemini API Key.)";
  }
  
  // Rate limit / Quota errors
  if (errorStr.includes("quota") || errorStr.includes("rate limit") || errorStr.includes("429") || errorStr.includes("resource exhausted")) {
    return "(System: API quota exceeded. Please try again later or check your Gemini API quota.)";
  }
  
  // Model not found errors
  if (errorStr.includes("not found") || errorStr.includes("404") || errorStr.includes("model")) {
    return `(System: Model error - ${errorMessage.slice(0, 80)}. Please check your API key and model access.)`;
  }
  
  // Fetch/HTTP errors - check for specific status codes
  if (errorStr.includes("fetch") || errorStr.includes("http") || lastError?.status) {
    const status = lastError?.status || 'unknown';
    if (status === 401 || status === 403) {
      return "(System: API Key is invalid or expired. Please get a new API key from https://aistudio.google.com/apikey)";
    }
    if (status === 429) {
      return "(System: Rate limit exceeded. Please wait a moment and try again.)";
    }
    return `(System: API Error (${status}) - ${errorMessage.slice(0, 100)}. Please check your API key at https://aistudio.google.com/apikey)`;
  }
  
  // Network errors - only if it's actually a network issue
  if ((errorStr.includes("network") || errorStr.includes("fetch failed") || errorStr.includes("timeout")) && 
      !errorStr.includes("api") && !errorStr.includes("model") && !errorStr.includes("key")) {
    return "(System: Network error. Please check your internet connection and try again.)";
  }
  
  // Return the actual error message so user can see what's wrong
  return `(System: ${errorMessage.slice(0, 120)})`;
};

export const analyzeDatasetValue = async (
  dataSummary: string
): Promise<{ title: string; description: string; priceSuggestion: number }> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Missing API Key");

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
      Analyze this raw plant-interaction dataset and package it for the Data Economy Marketplace.
      
      Dataset Summary:
      ${dataSummary}
      
      Output JSON format only:
      {
        "title": "A catchy, modern title for this dataset",
        "description": "A 2-sentence description highlighting the emotional value.",
        "priceSuggestion": number (between 100 and 1000)
      }
    `;

    // First, try to list available models
    let availableModels: string[] = [];
    try {
      const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listResponse.ok) {
        const listData = await listResponse.json();
        availableModels = (listData.models || []).map((m: any) => m.name?.replace('models/', '') || m.name).filter(Boolean);
      }
    } catch (e) {
      // Ignore listing errors
    }
    
    // Use the official SDK for analysis - try different models
    const modelsToTry = availableModels.length > 0 
      ? availableModels.filter(m => m.includes('gemini'))
      : ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-latest', 'gemini-pro'];
    let lastError: any = null;
    
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          }
        });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        if (text) {
          return JSON.parse(text);
        }
      } catch (err: any) {
        lastError = err;
        const errorMsg = err.message || '';
        if (errorMsg.includes('not supported for generateContent')) {
          continue; // Skip models that don't support this method
        }
        console.log(`Analysis model ${modelName} failed:`, errorMsg.slice(0, 100));
        continue;
      }
    }
    
    // If all models fail, throw error
    throw lastError || new Error("All model attempts failed for analysis");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      title: "Raw Bio-Data Upload",
      description: "Unprocessed capacitance and audio logs from a PlantBuddy device.",
      priceSuggestion: 50
    };
  }
};
