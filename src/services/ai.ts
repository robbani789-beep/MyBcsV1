import { ApiConfig } from '../types';

/**
 * Custom REST client for official Google Gemini API (browser safe & friendly).
 * Supports both standard 'AIzaSy...' keys and newer 'AQ...' key formats.
 */
export async function callGemini(
  prompt: string,
  config: ApiConfig,
  systemInstruction?: string
): Promise<string> {
  const selectedModel = config.geminiModel || 'gemini-2.5-flash';
  const apiKey = config.geminiKey.trim();

  if (!apiKey) {
    throw new Error('Please enter a valid Google Gemini API Key in the settings bar.');
  }

  const runRequest = async (modelName: string) => {
    // Official Google Generative Language REST endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: Failed to reach Gemini API.`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {}

      return { success: false, status: response.status, message: errorMessage };
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      return { success: false, status: 200, message: 'No content returned. Verify your API key has search and capability permissions.' };
    }

    return { success: true, text: textContent };
  };

  // Try the primary selected model
  let result = await runRequest(selectedModel);

  // If failed with permission error and not already using gemini-1.5-flash fallback, try fallback model!
  const isPermissionError = result.message?.includes("The caller does not have permission") || result.status === 403;
  if (!result.success && isPermissionError && selectedModel !== 'gemini-1.5-flash') {
    console.warn(`Permission error on ${selectedModel}. Automatically trying fallback model: gemini-1.5-flash...`);
    const fallbackResult = await runRequest('gemini-1.5-flash');
    if (fallbackResult.success) {
      return fallbackResult.text!;
    }
  }

  if (!result.success) {
    let errorMessage = result.message || 'Unknown error calling Gemini API';
    if (errorMessage.includes("The caller does not have permission") || result.status === 403) {
      errorMessage += `

💡 **How to fix this Permission Error:**
1. **If using a Google Cloud Console API Key (starts with "AQ"):** You must enable the **Generative Language API** in your Google Cloud project console to authorize this key. Go to your Google Cloud Console, search for **Generative Language API**, and click **Enable**.
2. **Alternatively (Recommended):** Get a free, instantly active API key (starts with "AIzaSy") directly from **[Google AI Studio](https://aistudio.google.com/)** by clicking **Create API Key**. This key requires no GCP project setup and works immediately!`;
    }
    throw new Error(errorMessage);
  }

  return result.text!;
}

/**
 * Fallback openrouter connection helper.
 */
export async function callOpenRouter(
  prompt: string,
  config: ApiConfig,
  systemInstruction?: string
): Promise<string> {
  const model = config.openrouterModel || 'meta-llama/llama-3.1-8b-instruct:free';
  const apiKey = config.openrouterKey.trim();

  if (!apiKey) {
    throw new Error('Please enter a valid OpenRouter API Key in the settings bar.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'BCS Study Hub App'
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: Failed to reach OpenRouter.`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned from OpenRouter.');
  }

  return content;
}

/**
 * Universal dispatcher that delegates to the active provider.
 */
export async function callAI(
  prompt: string,
  config: ApiConfig,
  systemInstruction?: string
): Promise<string> {
  if (config.provider === 'gemini') {
    return callGemini(prompt, config, systemInstruction);
  } else {
    return callOpenRouter(prompt, config, systemInstruction);
  }
}
