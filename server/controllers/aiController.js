const axios = require('axios');
const EmailHistory = require('../models/EmailHistory');

exports.generateEmail = async (req, res) => {
  try {
    const { prompt } = req.body;

    // =========================
    // AUTH USER CHECK
    // =========================

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    // =========================
    // VALIDATE PROMPT
    // =========================

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

    // =========================
    // GROQ API KEY
    // =========================

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return res.status(500).json({
        message: 'AI service is not configured'
      });
    }

    // =========================
    // SYSTEM PROMPT
    // =========================

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

    // =========================
    // USER PROMPT
    // =========================

    const userPrompt = `
Create a professional cold email based on this request:

"${prompt.trim()}"

Return only the JSON object.
`;

    // =========================
    // CALL GROQ API
    // =========================

    const aiResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
       model: "openai/gpt-oss-120b",

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

        reasoning_effort: 'none',
        reasoning_format: 'hidden',

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

    // =========================
    // CHECK GROQ RESPONSE
    // =========================

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

    // =========================
    // EMPTY RESPONSE
    // =========================

    if (!generatedText || generatedText.trim() === '') {
      return res.status(500).json({
        message: 'AI returned an empty response',
        error: 'Groq returned no content'
      });
    }

    generatedText = generatedText.trim();

    // =========================
    // REMOVE THINK TAGS
    // =========================

    generatedText = generatedText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();

    // =========================
    // REMOVE MARKDOWN
    // =========================

    generatedText = generatedText
      .replace(/^json\s*/i, '')
      .replace(/^\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // =========================
    // EXTRACT JSON
    // =========================

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

    // =========================
    // PARSE JSON
    // =========================

    let parsedResponse;

    try {
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error(
        'JSON PARSE ERROR:',
        parseError.message
      );

      console.error(
        'JSON TEXT:',
        jsonText
      );

      return res.status(500).json({
        message: 'Failed to parse AI response',
        error: 'The AI generated invalid JSON'
      });
    }

    // =========================
    // VALIDATE AI RESPONSE
    // =========================

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
      console.error(
        'INVALID AI DATA:',
        parsedResponse
      );

      return res.status(500).json({
        message: 'AI generated incomplete email data',
        error: 'Required fields are missing or invalid'
      });
    }

    // =========================
    // EMAIL DATA
    // =========================

    const emailData = {
      subject: parsedResponse.subject.trim(),
      emailBody: parsedResponse.emailBody.trim(),
      linkedInDM: parsedResponse.linkedInDM.trim(),
      followUpEmail: parsedResponse.followUpEmail.trim()
    };

    // =========================
    // FINAL VALIDATION
    // =========================

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

    // =========================
    // SAVE HISTORY
    // =========================

    const historyEntry = await EmailHistory.create({
      user: req.user._id,
      prompt: prompt.trim(),
      subject: emailData.subject,
      emailBody: emailData.emailBody,
      linkedInDM: emailData.linkedInDM,
      followUpEmail: emailData.followUpEmail
    });

    // =========================
    // SUCCESS
    // =========================

    return res.status(200).json(historyEntry);

  } catch (error) {

    console.error(
      '================ AI ERROR ================'
    );

    console.error(
      'STATUS:',
      error.response?.status
    );

    console.error(
      'GROQ ERROR:',
      JSON.stringify(
        error.response?.data,
        null,
        2
      )
    );

    console.error(
      'MESSAGE:',
      error.message
    );

    console.error(
      '=========================================='
    );

    // =========================
    // RATE LIMIT
    // =========================

    if (error.response?.status === 429) {
      return res.status(429).json({
        message:
          'Too many requests. Please wait a moment before trying again.',
        error: 'Rate limit exceeded'
      });
    }

    // =========================
    // GROQ ERROR
    // =========================

    return res.status(500).json({
      message: 'Failed to generate email',
      error:
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message
    });
  }
};


// ==========================================
// GET EMAIL HISTORY
// ==========================================

exports.getHistory = async (req, res) => {
  try {

    // =========================
    // AUTH USER CHECK
    // =========================

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    // =========================
    // GET HISTORY
    // =========================

    const history = await EmailHistory
      .find({
        user: req.user._id
      })
      .sort({
        createdAt: -1
      });

    return res.status(200).json(history);

  } catch (error) {

    console.error(
      'HISTORY ERROR:',
      error.message
    );

    return res.status(500).json({
      message: 'Failed to fetch history',
      error: error.message
    });
  }
};


exports.getHistory = async (req, res) => {
  try{
    const histroy = await EmailHistory.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(histroy);
  } catch(error){
    res.status(500).json({ message: 'Failed to fetch histroy', error: error.message });
  }
}