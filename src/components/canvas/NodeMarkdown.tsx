import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface Props {
  content: string;
}

// Renders node label text as Markdown. remark-breaks maps a single newline to a
// line break (so multi-line labels render as typed); remark-gfm adds lists,
// strikethrough, task lists, and autolinks. Raw HTML is not rendered (the
// default), so labels stay safe to display. Images are dropped to protect node
// layout — their text content, if any, is kept.
function NodeMarkdown({ content }: Props) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      disallowedElements={['img']}
      unwrapDisallowed
      components={{
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="nodrag">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </Markdown>
  );
}

export default memo(NodeMarkdown);
