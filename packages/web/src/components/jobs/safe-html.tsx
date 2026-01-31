import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders HTML content safely by sanitizing it with DOMPurify.
 * Used for job descriptions that may contain HTML formatting.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  // Sanitize HTML to prevent XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'span',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'blockquote',
      'pre',
      'code',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
