import { describe, expect, it } from 'vitest';

import { sanitizeClauseHtml } from './html-sanitizer';

describe('sanitizeClauseHtml', () => {
  it('keeps TipTap StarterKit formatting and strips all attributes', () => {
    expect(
      sanitizeClauseHtml(
        '<h2 data-level="2">Title</h2><p class="lead"><strong onclick="x">Bold</strong> <em>em</em> <s>old</s></p><ul><li style="color:red">one</li></ul><blockquote cite="x">quote</blockquote><pre><code class="language-js">x()</code></pre>',
      ),
    ).toBe(
      '<h2>Title</h2><p><strong>Bold</strong> <em>em</em> <s>old</s></p><ul><li>one</li></ul><blockquote>quote</blockquote><pre><code>x()</code></pre>',
    );
  });

  it('drops executable elements and event/source attributes', () => {
    expect(
      sanitizeClauseHtml(
        '<p>Safe</p><script>alert(1)</script><img src=x onerror=alert(2)><style>body{}</style><iframe src="x"></iframe>',
      ),
    ).toBe('<p>Safe</p>');
  });

  it('unwraps unsupported presentation tags but keeps their text', () => {
    expect(
      sanitizeClauseHtml('<section><div><a href="javascript:alert(1)">link</a></div></section>'),
    ).toBe('link');
  });
});
