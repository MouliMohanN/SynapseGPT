import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={`prose prose-slate prose-sm max-w-none text-slate-900
      prose-p:my-3 prose-p:leading-relaxed prose-p:text-slate-900
      prose-ul:my-3 prose-ul:pl-5 prose-ul:space-y-1
      prose-ol:my-3 prose-ol:pl-5 prose-ol:space-y-1
      prose-li:my-1 prose-li:text-slate-900
      prose-h1:text-lg prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-3 prose-h1:text-slate-900
      prose-h2:text-base prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-2 prose-h2:text-slate-900
      prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-slate-900
      prose-code:text-xs prose-code:bg-purple-100 prose-code:text-purple-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:font-medium
      prose-pre:my-4 prose-pre:bg-slate-50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-300
      prose-strong:font-semibold prose-strong:text-slate-900
      prose-a:text-purple-600 prose-a:underline prose-a:hover:text-purple-700
      ${className || ''}`}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !className;
            
            return !isInline && match ? (
              <div className="relative group">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codeString);
                  }}
                  className="absolute right-2 top-2 px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  Copy
                </button>
                <SyntaxHighlighter
                  style={prism as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e2e8f0',
                  }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table: (props) => (
            <div className="overflow-x-auto my-4">
              <table
                {...props}
                className="w-full border-collapse border border-slate-200 text-sm"
              />
            </div>
          ),
          thead: (props) => <thead {...props} className="bg-slate-50" />,
          th: (props) => (
            <th
              {...props}
              className="px-4 py-2 border border-slate-200 font-semibold text-left"
            />
          ),
          td: (props) => (
            <td
              {...props}
              className="px-4 py-2 border border-slate-200 align-top"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
