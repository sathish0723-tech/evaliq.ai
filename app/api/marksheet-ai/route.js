import { NextResponse } from 'next/server';

const GEMINI_API_KEY = "AIzaSyA6SmY9fDBSbnpmJWir58nC5BDkpH_wyxM";

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are a marksheet template designer AI. Based on user requests, you generate JSON arrays of elements for a marksheet canvas editor.

The canvas is 600x800 pixels. Generate elements that fit within these dimensions.

Available element types and their properties:
- LOGO: { type: "logo", x, y, width, height, content: "Institution Logo" }
- TEXT: { type: "text", x, y, width, height, content, fontSize, fontWeight, textAlign, textColor, backgroundColor }
- HEADING: { type: "heading", x, y, width, height, content, fontSize, fontWeight, textAlign, textColor, backgroundColor }
- STUDENT_NAME: { type: "student_name", x, y, width, height, content: "Student Name", fontSize, fontWeight, textAlign }
- FATHER_NAME: { type: "father_name", x, y, width, height, content: "Father's Name", fontSize }
- DOB: { type: "dob", x, y, width, height, content: "Date of Birth", fontSize }
- STUDENT_CLASS: { type: "student_class", x, y, width, height, content: "Class", fontSize }
- ROLL_NUMBER: { type: "roll_number", x, y, width, height, content: "Roll Number", fontSize }
- SUBJECTS_TABLE: { type: "subjects_table", x, y, width, height, subjects: [{name, maxMarks}] }
- PERCENTAGE: { type: "percentage", x, y, width, height, content: "Percentage", fontSize }
- GRADE: { type: "grade", x, y, width, height, content: "Grade", fontSize }
- RESULT: { type: "result", x, y, width, height, content: "Result", fontSize }
- REMARKS: { type: "remarks", x, y, width, height, content: "Remarks", fontSize }
- SIGNATURE: { type: "signature", x, y, width, height, content: "Principal Signature", fontSize }
- BOX: { type: "box", x, y, width, height, backgroundColor, borderColor }
- LINE: { type: "line", x, y, width, height, backgroundColor }
- CIRCLE: { type: "circle", x, y, width, height, backgroundColor, borderColor }
- PHOTO: { type: "photo", x, y, width, height, content: "Student Photo" }
- DATE_FIELD: { type: "date_field", x, y, width, height, content: "Date", fontSize }

Rules:
1. Generate a SIMPLE marksheet template with only ESSENTIAL elements (max 15 elements)
2. Include appropriate spacing between elements
3. Use proper font sizes (headings: 18-24px, text: 12-16px)
4. Center important elements like institution name
5. Each element needs a unique id (use format: "el_1", "el_2", etc.)
6. Keep it minimal - only include: heading, student info, subjects table, percentage, grade, result, signature
7. Do NOT include detailed addresses or too many decorative elements

Respond ONLY with a valid JSON object in this format:
{
  "templateName": "Template Name",
  "elements": [array of elements]
}

Do not include any explanation, just the JSON.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: `User request: ${prompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
    }

    const data = await response.json();
    
    // Extract the text response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse the JSON from the response
    let templateData;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = textResponse;
      if (textResponse.includes('```json')) {
        jsonStr = textResponse.split('```json')[1].split('```')[0].trim();
      } else if (textResponse.includes('```')) {
        jsonStr = textResponse.split('```')[1].split('```')[0].trim();
      }
      templateData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', textResponse);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templateName: templateData.templateName || 'AI Generated Template',
      elements: templateData.elements || []
    });

  } catch (error) {
    console.error('Error in marksheet-ai:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

