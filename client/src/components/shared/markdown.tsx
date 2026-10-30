import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Agent-written prose (the CEO's texts and reasons, issues, QA reports) rendered as Markdown.
// Safe by default: raw HTML is shown as text, never parsed, and only http(s)/mailto links work.

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

/** Turns raw HTML (`<script>`, `<img onerror>`, …) into plain text, so it's shown exactly as written. */
function remarkHtmlAsText() {
  const walk = (node: MdNode) => {
    if (node.type === 'html') node.type = 'text';
    node.children?.forEach(walk);
  };
  return walk;
}

const SAFE_LINK = /^(https?:|mailto:)/i;
const safeUrl = (url: string) => (SAFE_LINK.test(url.trim()) ? url : '');

const components: Components = {
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
        {children}
      </a>
    ) : (
      <span className="text-muted-foreground">{children}</span>
    ),
  // Images would load arbitrary URLs and blow up the layout; show them as links instead.
  img: ({ src, alt }) =>
    typeof src === 'string' && src ? (
      <a href={src} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        {alt || src}
      </a>
    ) : (
      <span>{alt}</span>
    ),
  p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-3">{children}</p>,
  ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-1">{children}</ol>,
  h1: ({ children }) => <h3 className="mt-4 text-base font-semibold">{children}</h3>,
  h2: ({ children }) => <h4 className="mt-4 text-sm font-semibold">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-3 text-sm font-semibold">{children}</h5>,
  blockquote: ({ children }) => <blockquote className="mt-3 border-l-2 pl-3 text-muted-foreground">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
  // Code blocks and tables scroll sideways: focusable, so the keyboard can scroll them too.
  pre: ({ children }) => (
    <pre tabIndex={0} className="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div tabIndex={0} className="mt-3 overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <table className="w-full text-sm [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">{children}</table>
    </div>
  ),
};

// remark-breaks keeps single line breaks, as agents write them.
const remarkPlugins = [remarkGfm, remarkHtmlAsText, remarkBreaks];

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('text-sm break-words', className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components} urlTransform={safeUrl}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
