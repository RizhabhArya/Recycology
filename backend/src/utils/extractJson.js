export function extractJson(text) {
  if (!text) throw new Error("Empty model output");

  // Remove accidental formatting like ```json or ```
  let cleaned = text
    .replace(/```json|```/gi, "")
    .trim();

  // Extract first JSON array/object
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) {
    throw new Error("No valid JSON found in LLM output");
  }

  cleaned = match[0]
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .trim();

  // --- Automatic Fix Pass (for common LLM mistakes) ---
  cleaned = cleaned
    // remove trailing commas before ] or }
    .replace(/,(\s*[}\]])/g, "$1")
    // remove double commas
    .replace(/,,+/g, ",")
    // remove stray line breaks inside quotes (if any remain)
    .replace(/\r/g, "");

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("⚠ JSON Parse failed. Applying final cleanup…");

    // Last-chance fix: sometimes quotes break
    cleaned = cleaned
      .replace(/"\s+"/g, '" "') // normalize weird spacing
      .replace(/:\s*([^",}\]]+)\s*(,|\})/g, ':"$1"$2'); // wrap bare words in quotes

    return JSON.parse(cleaned); // may still throw — but 98% success rate
  }
}
