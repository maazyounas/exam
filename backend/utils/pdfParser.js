// Require pdf-parse. Some versions export the function as a default property.
// Robust import for pdf-parse handling both CommonJS and ES module exports.
const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;

/**
 * Parse MCQ questions from a PDF buffer.
 *
 * Supported format:
 *   Question text here?
 *
 *   A. Option one
 *   B. Option two
 *   C. Option three
 *   D. Option four
 *
 *   Answer: B
 *
 * @param {Buffer} pdfBuffer - The raw PDF file buffer
 * @returns {Promise<Array>} - Array of parsed question objects
 */
async function parsePdfQuestions(pdfBuffer) {
  // Extract raw text from the PDF
  const data = await pdfParse(pdfBuffer);
  const rawText = data.text;

  const questions = [];

  // Normalize line endings and split into lines
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let i = 0;

  while (i < lines.length) {
    // --- Try to detect the start of a question ---
    // A question is any line that is NOT an option line (A./B./C./D.) and NOT an answer line
    const line = lines[i];

    const isOptionLine = /^[A-D][.)]\s+/i.test(line);
    const isAnswerLine = /^answer\s*[:=]\s*/i.test(line);

    if (isOptionLine || isAnswerLine) {
      // Skip orphan option/answer lines
      i++;
      continue;
    }

    // This line looks like a question text — collect multi-line question text
    let questionText = line;
    i++;

    // Keep appending lines that are part of the question (not option/answer lines)
    while (i < lines.length) {
      const nextLine = lines[i];
      if (/^[A-D][.)]\s+/i.test(nextLine) || /^answer\s*[:=]\s*/i.test(nextLine)) {
        break;
      }
      // Could be continuation of question text, or start of next question
      // We'll check if the NEXT lines after this one have options
      // For now, just break — single-line questions are the common case
      // If the next line isn't an option, it might be a new question
      break;
    }

    // --- Collect options (A, B, C, D) ---
    const options = [];
    const optionMap = {}; // e.g. { 'A': 'Option text', 'B': '...' }

    while (i < lines.length && /^[A-D][.)]\s+/i.test(lines[i])) {
      const optLine = lines[i];
      const match = optLine.match(/^([A-D])[.)]\s+(.+)/i);
      if (match) {
        const letter = match[1].toUpperCase();
        const text = match[2].trim();
        options.push(text);
        optionMap[letter] = text;
      }
      i++;
    }

    // --- Collect answer ---
    let correctAnswer = '';

    if (i < lines.length && /^answer\s*[:=]\s*/i.test(lines[i])) {
      const ansMatch = lines[i].match(/^answer\s*[:=]\s*(.+)/i);
      if (ansMatch) {
        const ansValue = ansMatch[1].trim();

        // If the answer is a single letter (A/B/C/D), map it to the option text
        if (/^[A-D]$/i.test(ansValue)) {
          correctAnswer = optionMap[ansValue.toUpperCase()] || ansValue;
        } else {
          // The answer is the full text
          correctAnswer = ansValue;
        }
      }
      i++;
    }

    // --- Validate and push ---
    // A valid question needs: question text, at least 2 options, and a correct answer
    if (questionText && options.length >= 2 && correctAnswer) {
      questions.push({
        questionText,
        options,
        correctAnswer,
      });
    }
  }

  return questions;
}

module.exports = { parsePdfQuestions };
