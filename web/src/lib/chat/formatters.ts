export function formatAssistantResponse(content: string): string {
  if (!content) return content;
  
  let formatted = content;
  
  // Add extra line break before markdown headings (# ## ### etc)
  formatted = formatted.replace(/\n(#{1,6}\s)/g, "\n\n$1");
  
  // Add extra line break before list items at the start of a line
  formatted = formatted.replace(/\n([*\-+]|\d+\.)\s/g, "\n\n$1 ");
  
  // Ensure double line breaks between paragraphs (but don't triple them)
  formatted = formatted.replace(/\n\n\n+/g, "\n\n");
  
  // Add line break before code blocks
  formatted = formatted.replace(/\n```/g, "\n\n```");
  
  return formatted.trim();
}
