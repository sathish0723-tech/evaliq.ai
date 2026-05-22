const text = '> 🔍 Analyzing your query...\n\n> 🧠 Generating database query...\n\n> 📊 Executing query on database...\n\n> 📋 Processing results...\n\n> 📝 Enriching data with attendance info...\n\n> ✨ Generating detailed analysis...\n\n---\n\nBased on your query';
const stripReasoningTrace = (text) => {
    if (!text || typeof text !== 'string') return text;
    if (text.trim().startsWith('> ')) {
        const parts = text.split('---');
        if (parts.length > 1) return parts.slice(1).join('---').trim();
        return text.replace(/^\s*(?:>\s*[^\n]*\n\s*)+/, '').trim();
    }
    return text;
};
console.log(stripReasoningTrace(text));
