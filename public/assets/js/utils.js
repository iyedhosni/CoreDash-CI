// utils.js

/**
 * Escape XML special characters so we can safely inject user input
 */
export function escapeXml(s) {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
  }[c]));
}

/**
 * Remove any unreplaced ${TOKEN} placeholders,
 * strip out empty elements like <foo></foo>,
 * and collapse blank lines.
 */
export function cleanupXml(xml) {
  return xml
    // 1) remove leftover ${TOKENS}
    .replace(/\$\{[A-Z0-9_]+\}/g, '')
    // 2) strip empty tags: <tag></tag>
    .replace(/<([a-zA-Z0-9:_-]+)>\s*<\/\1>/g, '')
    // 3) collapse blank lines
    .replace(/^\s*[\r\n]/gm, '');
}
