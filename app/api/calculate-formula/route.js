import { NextResponse } from 'next/server'

const GEMINI_API_KEY = "AIzaSyA6SmY9fDBSbnpmJWir58nC5BDkpH_wyxM"

const SYSTEM_PROMPT = `You are a calculation formula generator for educational marksheet systems. Your task is to convert natural language descriptions into mathematical formulas that can be evaluated in JavaScript.

Available Variables:
- sum: Sum of all marks across all tests for a student
- totalMarks: Total marks obtained by student across all tests
- totalMaxMarks: Total maximum marks possible across all tests
- count: Number of tests
- average: Average marks (totalMarks / count)
- avg: Same as average

Important Context:
- When user mentions "subjects", "unique subjects", or "number of subjects", use "count" variable
- When user mentions "total marks" or "sum of marks", use "totalMarks" or "sum"
- When user mentions "divided by subjects" or "per subject", divide by "count"
- Operations should be performed in correct order using parentheses

Rules:
1. Return ONLY the mathematical formula, no explanations, no markdown, no code blocks
2. Use JavaScript-compatible syntax
3. Use parentheses for clarity and correct order of operations
4. Support operations: +, -, *, /, %
5. Parse natural language step by step:
   - "sum" or "total marks" → sum or totalMarks
   - "divided by" or "/" → division operator (/)
   - "multiplied by" or "times" or "multiple" or "*" → multiplication operator (*)
   - "subjects" or "unique subjects" or "number of subjects" → count
   - "overall" or "total" → refers to aggregation across all tests
   - "100" or "multiple 100" or "times 100" → * 100
6. CRITICAL: If the prompt mentions "multiple 100", "times 100", or "multiply by 100", you MUST include "* 100" in the formula
7. When combining division and multiplication, use parentheses: (sum / count) * 100

Examples:
- "percentage" or "percentage calculation" → (totalMarks / totalMaxMarks) * 100
- "average marks" → totalMarks / count
- "half of sum" → sum / 2
- "sum divided by 2 times 100" → (sum / 2) * 100
- "sum the total marks and divided by the total unique subjects overall multiple 100" → (sum / count) * 100
- "Sum the total marks and divided by the total unique subjects overall multiple 100" → (sum / count) * 100
- "total marks divided by number of subjects multiplied by 100" → (totalMarks / count) * 100
- "sum divided by subjects times 100" → (sum / count) * 100
- "sum divided by subjects multiple 100" → (sum / count) * 100
- "average percentage" → (totalMarks / totalMaxMarks) * 100
- "sum per subject times 100" → (sum / count) * 100
- "sum divided by subjects and multiple 100" → (sum / count) * 100

Return format: 
- Return ONLY the complete formula string
- The formula must be complete and valid JavaScript
- Do NOT return partial formulas like "(sum /" or incomplete expressions
- Examples of correct output:
  * (sum / count) * 100
  * totalMarks / count
  * (totalMarks / totalMaxMarks) * 100
- Do NOT include explanations, code blocks, markdown, or any other text
- The formula must start with a variable and end with a number or variable, not an operator`

export async function POST(request) {
  try {
    const { prompt, availableVariables } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Use Gemini API
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
                { text: SYSTEM_PROMPT },
                { text: `User prompt: "${prompt}"

IMPORTANT: If the prompt contains "multiple 100", "times 100", "multiply by 100", or mentions "100" after division, you MUST include "* 100" in the final formula.

Generate the formula now:` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API error:', errorData)
      // Fallback to rule-based generation
      const formula = generateFormulaFromRules(prompt, availableVariables)
      return NextResponse.json({ formula })
    }

    const data = await response.json()
    
    // Extract the text response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!textResponse) {
      console.log('No text response from Gemini, using fallback')
      // Fallback to rule-based generation
      const formula = generateFormulaFromRules(prompt, availableVariables)
      return NextResponse.json({ formula })
    }

    console.log('Gemini raw response:', textResponse)

    // Clean up the formula (remove markdown, extra text)
    let cleanFormula = textResponse
      .replace(/```[\w]*\n?/g, '')
      .replace(/`/g, '')
      .trim()
      .split('\n')[0] // Take first line only
      .replace(/^formula[:\s]*/i, '')
      .replace(/^result[:\s]*/i, '')
      .replace(/^answer[:\s]*/i, '')
      .trim()

    // Check if formula is incomplete (contains incomplete operators like "/." or ends with operators)
    const incompletePatterns = [
      /\/\./,  // "/."
      /\/\s*$/,  // ends with "/"
      /\*\s*$/,  // ends with "*"
      /\(\s*$/,  // ends with "("
      /^\s*\(/,  // starts with just "("
      /\/\s*$/,  // ends with "/ "
      /\/\./,  // contains "/."
    ]

    // Check for balanced parentheses
    const openParens = (cleanFormula.match(/\(/g) || []).length
    const closeParens = (cleanFormula.match(/\)/g) || []).length
    const hasUnbalancedParens = openParens !== closeParens

    const isIncomplete = incompletePatterns.some(pattern => pattern.test(cleanFormula)) || 
                         cleanFormula.length < 5 || // Too short to be valid
                         !cleanFormula.match(/[a-zA-Z]/) || // No variables
                         hasUnbalancedParens || // Unbalanced parentheses
                         /[+\-*/]\s*$/.test(cleanFormula) // Ends with operator

    if (!cleanFormula || isIncomplete) {
      console.log('Formula appears incomplete or invalid:', cleanFormula, 'Using fallback')
      // Fallback to rule-based generation
      const formula = generateFormulaFromRules(prompt, availableVariables)
      return NextResponse.json({ formula })
    }

    console.log('Final formula:', cleanFormula)
    return NextResponse.json({ formula: cleanFormula })
  } catch (error) {
    console.error('Error generating formula:', error)
    
    // Fallback to rule-based generation
    try {
      const body = await request.json()
      const formula = generateFormulaFromRules(body.prompt, body.availableVariables)
      return NextResponse.json({ formula })
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to generate formula' },
        { status: 500 }
      )
    }
  }
}

// Rule-based formula generation as fallback
function generateFormulaFromRules(prompt, availableVariables = []) {
  const lowerPrompt = prompt.toLowerCase()

  // Check for "subjects" or "unique subjects" pattern - map to count
  const hasSubjects = lowerPrompt.includes('subject') || lowerPrompt.includes('unique')
  const hasSum = lowerPrompt.includes('sum') || lowerPrompt.includes('total marks')
  const hasDivide = lowerPrompt.includes('divide') || lowerPrompt.includes('/')
  const hasMultiply = lowerPrompt.includes('multiply') || lowerPrompt.includes('times') || lowerPrompt.includes('multiple')
  const has100 = lowerPrompt.includes('100')

  // Pattern: "sum divided by subjects times 100" or "total marks divided by unique subjects multiplied by 100"
  // Also check for "multiple 100" pattern explicitly
  if (hasSum && hasSubjects && hasDivide && (hasMultiply || has100)) {
    // If it mentions 100 or multiply/times/multiple, include * 100
    if (has100 || hasMultiply) {
      return '(sum / count) * 100'
    }
    // Otherwise just division
    return 'sum / count'
  }

  // Pattern: "sum divided by subjects" or "total marks divided by unique subjects" (without multiplication)
  if (hasSum && hasSubjects && hasDivide && !hasMultiply && !has100) {
    return 'sum / count'
  }

  // Pattern: "sum divided by count times 100"
  if (hasSum && hasDivide && hasMultiply && has100) {
    // Check if there's a specific number
    const numberMatch = lowerPrompt.match(/divide\s*(?:by)?\s*(\d+)|(\d+)\s*(?:times|multiply|multiple)/i)
    if (numberMatch) {
      const divisor = numberMatch[1] || numberMatch[2]
      return `(sum / ${divisor}) * 100`
    }
    return '(sum / count) * 100'
  }

  // Percentage calculations
  if (lowerPrompt.includes('percentage') || lowerPrompt.includes('percent')) {
    if (lowerPrompt.includes('50') || lowerPrompt.includes('half')) {
      return '(totalMarks / totalMaxMarks) * 50'
    }
    return '(totalMarks / totalMaxMarks) * 100'
  }

  // Average calculations
  if (lowerPrompt.includes('average') || lowerPrompt.includes('avg')) {
    return 'totalMarks / count'
  }

  // Sum calculations with division
  if (hasSum && hasDivide) {
    const numberMatch = lowerPrompt.match(/divide\s*(?:by)?\s*(\d+)|(\d+)\s*times/i)
    if (numberMatch) {
      const divisor = numberMatch[1] || numberMatch[2]
      if (has100 || lowerPrompt.includes('times 100')) {
        return `(sum / ${divisor}) * 100`
      }
      return `sum / ${divisor}`
    }
    if (lowerPrompt.includes('2') && has100) {
      return '(sum / 2) * 100'
    }
    if (lowerPrompt.includes('2')) {
      return 'sum / 2'
    }
    // If dividing by subjects but no number specified
    if (hasSubjects) {
      return 'sum / count'
    }
  }

  // Sum calculations with multiplication
  if (hasSum && hasMultiply) {
    const numberMatch = lowerPrompt.match(/times\s*(\d+)|multiply\s*(?:by)?\s*(\d+)/i)
    if (numberMatch) {
      const multiplier = numberMatch[1] || numberMatch[2]
      return `sum * ${multiplier}`
    }
    if (has100) {
      return 'sum * 100'
    }
  }

  // Division patterns
  if (hasDivide && !hasSum) {
    const numberMatch = lowerPrompt.match(/divide\s*(?:by)?\s*(\d+)|(\d+)\s*times/i)
    if (numberMatch) {
      const divisor = numberMatch[1] || numberMatch[2]
      if (has100) {
        return `(totalMarks / ${divisor}) * 100`
      }
      return `totalMarks / ${divisor}`
    }
    if (lowerPrompt.includes('2')) {
      if (has100) {
        return '(totalMarks / 2) * 100'
      }
      return 'totalMarks / 2'
    }
    if (hasSubjects) {
      return 'totalMarks / count'
    }
  }

  // Multiplication patterns
  if (hasMultiply && !hasSum && !hasDivide) {
    const numberMatch = lowerPrompt.match(/times\s*(\d+)|multiply\s*(?:by)?\s*(\d+)/i)
    if (numberMatch) {
      const multiplier = numberMatch[1] || numberMatch[2]
      return `totalMarks * ${multiplier}`
    }
    if (has100) {
      return 'totalMarks * 100'
    }
  }

  // Default: return sum
  return 'sum'
}

