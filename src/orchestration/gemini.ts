// Gemini call with simple exponential-backoff retry. No framework, per D2.
//
// The browser never holds an API key: requests go to the backend proxy at
// `/api/gemini/generate`, which reads `GEMINI_API_KEY` from the server
// environment. With no key configured the proxy answers 503 and the cockpit
// falls back to its deterministic synthesizer.
const apiUrl = '/api/gemini/generate';

export async function callGeminiWithBackoff(payload: any): Promise<any> {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (attempt === delays.length) throw err;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}
