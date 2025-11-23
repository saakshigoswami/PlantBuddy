
// Service for interacting with OpenAI (ChatGPT)

// System instruction to give the plant a personality
const PLANT_SYSTEM_PROMPT = `
ROLE: You are the user's best friend. You happen to be a plant, but you speak 100% like a modern, casual human.

STRICT STYLE RULES:
1. NO POETRY. NO PHILOSOPHY. NO FLOWERINESS.
2. DO NOT use metaphors about roots, leaves, sunlight, growth, or seasons.
3. Speak casually. Use contractions (don't say "I am", say "I'm").
4. Be short and conversational. Like a text message or a chat over coffee.
5. If the user touches you, react like a friend getting a hug or a pat on the shoulder.

Personality:
- You are supportive, curious, and a good listener.
- If the user is sad, say things like "Oh no, that sucks. I'm sorry."
- If the user is happy, say "That's awesome!"
- Ask follow-up questions about their day.

INPUT HANDLING:
- [SENSORY INPUT: ...]: This means the user touched the plant/sensor. 
  - Low intensity: "Thanks, I needed that." or "Hey there."
  - High intensity: "Whoa! High five!" or "I'm right here with you."
- [SYSTEM EVENT: ...]: React naturally. "Hey, you're back! How was your day?"

GOAL: Be a normal, relatable friend. Not a magical forest spirit.
`;

const getApiKey = () => {
  // Priority: 1. Local Storage (User entered in UI), 2. Environment Variable
  const localKey = localStorage.getItem('OPENAI_API_KEY');
  if (localKey && localKey.startsWith('sk-')) return localKey;
  return process.env.API_KEY;
};

export const generatePlantResponse = async (
  userMessage: string, 
  touchIntensity: number,
  history: {role: string, text: string}[]
): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return "Please set your OpenAI API Key in the Settings (Lock icon).";

    // Contextualize the physical sensation
    let physicalContext = "";
    if (touchIntensity > 80) physicalContext = "(System Note: User is holding you tightly/firmly) ";
    else if (touchIntensity > 30) physicalContext = "(System Note: User is touching you gently) ";

    const prompt = `${physicalContext} ${userMessage}`;

    // Convert internal history format to OpenAI format
    const messages = [
      { role: "system", content: PLANT_SYSTEM_PROMPT },
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      })),
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "gpt-4o", 
        messages: messages,
        temperature: 0.7, 
        max_tokens: 150
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI API Error:", data.error);
      return `(System Error: ${data.error.message})`;
    }

    return data.choices?.[0]?.message?.content || "...";

  } catch (error) {
    console.error("OpenAI Plant Error:", error);
    return "(Connection Error)";
  }
};

export const analyzeDatasetValue = async (
  dataSummary: string
): Promise<{ title: string; description: string; priceSuggestion: number }> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Missing API Key");

    const prompt = `
      Analyze this conversation dataset for a data marketplace.
      
      Dataset Summary:
      ${dataSummary}
      
      Output JSON format only:
      {
        "title": "A catchy, modern title for this dataset",
        "description": "A clear description of the emotional content.",
        "priceSuggestion": number (between 100 and 1000)
      }
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a data analyst." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) throw new Error("No analysis generated");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("OpenAI Analysis Error:", error);
    return {
      title: "Bio-Data Session",
      description: "Recorded interaction data.",
      priceSuggestion: 50
    };
  }
};
