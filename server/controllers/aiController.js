const axios = require('axios');
const EmailHistory = require('../models/EmailHistory');

exports.generateEmail = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    if (!prompt) {
      return res.status(400).json({
        message: 'Prompt is required'
      });
    }

    if (typeof prompt !== 'string') {
      return res.status(400).json({
        message: 'Prompt must be a string'
      });
    }

    if (prompt.trim().length === 0) {
      return res.status(400).json({
        message: 'Prompt cannot be empty'
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        message: 'Prompt cannot exceed 2000 characters'
      });
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return res.status(500).json({
        message: 'AI service is not configured'
      });
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
Rules:
SUBJECT:
- 6 to 9 words
- Professional and confident
- No "Quick question"
- No "Job application"
- No "Looking for opportunity"
EMAIL BODY:
- 60 to 90 words
- Professional
- Personalized
- Clear value proposition
- Clear CTA
- Professional sign-off
- No emojis
LINKEDIN DM:
- 30 to 50 words
- Conversational
- Short
- Clear value
- Soft CTA
FOLLOW-UP EMAIL:
- 50 to 80 words
- Different angle from the first email
- Professional
- Clear value
- Clear CTA
IMPORTANT:
- Return ONLY JSON.
- Do not return markdown.
- Do not use code fences.
- Do not return explanations.
- Do not return analysis.
- Do not return thinking.
- Do not return <think> tags.
- Do not add extra fields.
- All four values must be strings.
`;

    const userPrompt = `
Create a professional cold email based on this request:
"${prompt.trim()}"
Return only the JSON object.
`;

const aiResponse = await axios.post(
  'https://groq.com',
  {
    model: "llama-3.3-70b-versatile", 
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    temperature: 0.2,
    max_completion_tokens: 4096,
    response_format: {
      type: 'json_object'
    }
  },
  {
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  }
);


    if (
      !aiResponse.data ||
      !aiResponse.data.choices ||
      !aiResponse.data.choices[0] ||
      !aiResponse.data.choices[0].message
    ) {
      throw new Error('Invalid response from Groq API');
    }

    const message = aiResponse.data.choices[0].message;

    console.log(
      'GROQ MESSAGE:',
      JSON.stringify(message, null, 2)
    );

    let generatedText = message.content;

    console.log(
      'AI RAW CONTENT:',
      JSON.stringify(generatedText)
    );

    if (!generatedText || generatedText.trim() === '') {
      return res.status(500).json({
        message: 'AI returned an empty response',
        error: 'Groq returned no content'
      });
    }

    generatedText = generatedText.trim();

    generatedText = generatedText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();

    generatedText = generatedText
      .replace(/^json\s*/i, '')
      .replace(/^\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const jsonStart = generatedText.indexOf('{');
    const jsonEnd = generatedText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      console.error(
        'NO JSON FOUND:',
        generatedText
      );

      return res.status(500).json({
        message: 'Failed to parse AI response',
        error: 'AI did not return a JSON object'
      });
    }

    const jsonText = generatedText.substring(
      jsonStart,
      jsonEnd + 1
    );

    console.log(
      'EXTRACTED JSON:',
      jsonText
    );

    let parsedResponse;

    try {
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error(
        'JSON PARSE ERROR:',
        parseError.message
      );

      return res.status(500).json({
        message: 'Failed to parse AI response',
        error: 'The AI generated invalid JSON'
      });
    }

    if (
      !parsedResponse ||
      typeof parsedResponse !== 'object'
    ) {
      return res.status(500).json({
        message: 'AI generated invalid data',
        error: 'Response is not an object'
      });
    }

    if (
      typeof parsedResponse.subject !== 'string' ||
      typeof parsedResponse.emailBody !== 'string' ||
      typeof parsedResponse.linkedInDM !== 'string' ||
      typeof parsedResponse.followUpEmail !== 'string'
    ) {
      return res.status(500).json({
        message: 'AI generated incomplete email data',
        error: 'Required fields are missing or invalid'
      });
    }

    const emailData = {
      subject: parsedResponse.subject.trim(),
      emailBody: parsedResponse.emailBody.trim(),
      linkedInDM: parsedResponse.linkedInDM.trim(),
      followUpEmail: parsedResponse.followUpEmail.trim()
    };

    if (
      !emailData.subject ||
      !emailData.emailBody ||
      !emailData.linkedInDM ||
      !emailData.followUpEmail
    ) {
      return res.status(500).json({
        message: 'AI generated incomplete email data',
        error: 'One or more fields are empty'
      });
    }

    const historyEntry = await EmailHistory.create({
      user: req.user._id,
      prompt: prompt.trim(),
      subject: emailData.subject,
      emailBody: emailData.emailBody,
      linkedInDM: emailData.linkedInDM,
      followUpEmail: emailData.followUpEmail
    });

    return res.status(200).json(historyEntry);

  } catch (error) {
    console.error('================ AI ERROR ================');
    console.error('STATUS:', error.response?.status);
    console.error('GROQ ERROR:', JSON.stringify(error.response?.data, null, 2));
    console.error('MESSAGE:', error.message);
    console.error('==========================================');

    if (error.response?.status === 429) {
      return res.status(429).json({
        message: 'Too many requests. Please wait a moment before trying again.',
        error: 'Rate limit exceeded'
      });
    }

    return res.status(500).json({
      message: 'Failed to generate email',
      error: error.response?.data?.error?.message || error.response?.data?.error || error.message
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const history = await EmailHistory.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    console.error('HISTORY ERROR:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch history',
      error: error.message
    });
  }
};
