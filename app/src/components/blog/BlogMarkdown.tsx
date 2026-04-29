import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const codeTheme = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    margin: 0,
    background: 'transparent',
    fontSize: '0.9rem',
    lineHeight: '1.78',
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '0.9rem',
    lineHeight: '1.78',
  },
};

const getCodeLanguage = (className?: string) => {
  const match = /language-([\w-]+)/.exec(className ?? '');
  return match?.[1] ?? 'text';
};

export function BlogMarkdown(props: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="blog-prose-h1">{children}</h1>,
        h2: ({ children }) => <h2 className="blog-prose-h2">{children}</h2>,
        h3: ({ children }) => <h3 className="blog-prose-h3">{children}</h3>,
        p: ({ children }) => <p className="blog-prose-p">{children}</p>,
        blockquote: ({ children }) => (
          <blockquote className="blog-prose-quote">{children}</blockquote>
        ),
        ul: ({ children }) => <ul className="blog-prose-ul">{children}</ul>,
        ol: ({ children }) => <ol className="blog-prose-ol">{children}</ol>,
        li: ({ children }) => <li className="blog-prose-li">{children}</li>,
        a: ({ href, children }) => (
          <a href={href} className="blog-prose-link">
            {children}
          </a>
        ),
        code: ({ inline, className, children }) => {
          if (inline) {
            return <code className="blog-prose-inline-code">{children}</code>;
          }

          return (
            <SyntaxHighlighter
              language={getCodeLanguage(className)}
              style={codeTheme}
              PreTag="div"
              className="blog-prose-code-block"
              customStyle={{ margin: 0, background: 'transparent' }}
              codeTagProps={{ className: 'blog-prose-code' }}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          );
        },
        pre: ({ children }) => <div className="blog-prose-pre">{children}</div>,
        hr: () => <hr className="blog-prose-hr" />,
      }}
    >
      {props.source}
    </ReactMarkdown>
  );
}
