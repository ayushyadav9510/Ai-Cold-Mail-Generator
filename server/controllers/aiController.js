const axios = require('axios');
const EmailHistory = require('../models/EmailHistory');

exports.generateEmail = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ message: 'Valid Prompt is required' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ message: 'AI service is not configured' });
    }

    const systemPrompt = `
You are an expert cold email writer.
Generate a professional cold email based on the user's request.
Return ONLY a valid JSON object.
The JSON object MUST contain exactly these four fields:
{
  "subject": "",
  "emailBody": "",
  "linkedInDM": "",
  "followUpEmail": ""
}
Rules: All values must be strings. No markdown formatting or code fences.
`;

    const userPrompt = `Create a professional cold email based on this request: "${prompt.trim()}". Return only the JSON object.`;

    // ✨ 100% CORRECT OFFICIAL GROQ ENDPOINT & STABLE MODEL CONFIG
    const aiResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama-3.3-70b-versatile", 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_completion_tokens: 4096,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    if (!aiResponse?.data?.choices?.[0]?.message) {
      throw new Error('Invalid response structure from Groq API');
    }

    let generatedText = aiResponse.data.choices[0].message.content.trim();

    generatedText = generatedText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^```json\s*/i, '')
      .replace(/^json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedResponse = JSON.parse(generatedText);

    const historyEntry = await EmailHistory.create({
      user: req.user._id,
      prompt: prompt.trim(),
      subject: parsedResponse.subject.trim(),
      emailBody: parsedResponse.emailBody.trim(),
      linkedInDM: parsedResponse.linkedInDM.trim(),
      followUpEmail: parsedResponse.followUpEmail.trim()
    });

    return res.status(200).json(historyEntry);

  } catch (error) {
    console.error('================ AI ERROR ================');
    console.error('STATUS:', error.response?.status);
    console.error('GROQ ERROR:', JSON.stringify(error.response?.data, null, 2));
    console.error('MESSAGE:', error.message);
    console.error('==========================================');

    return res.status(500).json({
      message: 'Failed to generate email',
      error: error.response?.data?.error?.message || error.message
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const history = await EmailHistory.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch history', error: error.message });
  }
};
