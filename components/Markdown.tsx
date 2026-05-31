/**
 * Renders Markdown to HTML (GitHub-flavoured). Kept as a standalone *sync*
 * server component: react-markdown's element type clashes with React 19's
 * async-Server-Component return type when used directly inside an async page.
 *
 * Raw HTML in the source is intentionally NOT rendered (no rehype-raw), so
 * n8n-authored content can't inject markup — images/links use Markdown syntax.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}
