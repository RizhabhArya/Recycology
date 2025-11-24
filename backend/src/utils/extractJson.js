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
    // normalize different quote characters
    .replace(/[“”«»„”]/g, '"')
    // convert single-quoted strings to double-quoted (simple cases)
    .replace(/'([^']*)'/g, '"$1"')
    // remove trailing commas before ] or }
    .replace(/,(\s*[}\]])/g, "$1")
    // remove double commas
    .replace(/,,+/g, ",")
    // remove stray carriage returns
    .replace(/\r/g, "");

  // Quote unquoted object keys: { key: or , key:  => { "key":
  // This is a best-effort regex and avoids touching already-quoted keys.
  cleaned = cleaned.replace(/([\{,]\s*)([A-Za-z0-9_\- ]+?)\s*:/g, (m, p1, p2) => {
    // If key already contains a quote, skip
    if (/^\s*\"/.test(p2) || /^\s*\'/.test(p2)) return m;
    // Trim and escape double quotes inside key
    const key = p2.trim().replace(/\"/g, '\\\"');
    return `${p1}\"${key}\":`;
  });

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("⚠ JSON Parse failed. Applying final cleanup…");

    // Last-chance fixes
    cleaned = cleaned
      .replace(/"\s+"/g, '" "') // normalize weird spacing
      // wrap bare words (values) in quotes when safe: : word, or : word}
      .replace(/:\s*([^\",\}\]\n]+)\s*(,|\}|\])/g, ':"$1"$2');

    // Try parsing again
    return JSON.parse(cleaned);
  }
}
