import type { ReactNode } from "react";
import { Fragment } from "react";

/**
 * A minimal, safe Markdown-subset renderer for Text content blocks
 * (PRODUCT_SPEC.md §5, SECURITY.md §1): headings, bold, italic, lists,
 * links, and inline code — the same finite set the composer's toolbar
 * exposes (STAGE_1A_UX_ARCHITECTURE.md §I: "never exposes an insert raw
 * HTML affordance"). This never touches `dangerouslySetInnerHTML` or any
 * HTML string — it parses text into a small AST and renders that AST
 * directly as React elements, so there is no HTML-injection surface at
 * all, not even one relying on a sanitizer to catch mistakes.
 *
 * Any raw-looking HTML in the source (e.g. `<script>`) is treated as
 * literal text, because this renderer never interprets `<...>` as markup
 * in the first place — it simply isn't part of the supported syntax.
 */

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: links, then bold, then inline code, then italic.
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, match.index)}</Fragment>,
      );
    }
    if (match[1] !== undefined && match[2] !== undefined) {
      const href = match[2];
      if (isSafeUrl(href)) {
        nodes.push(
          <a key={`${keyPrefix}-a${i++}`} href={href} target="_blank" rel="noopener noreferrer">
            {match[1]}
          </a>,
        );
      } else {
        nodes.push(<Fragment key={`${keyPrefix}-a${i++}`}>{match[1]}</Fragment>);
      }
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${i++}`}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<code key={`${keyPrefix}-c${i++}`}>{match[4]}</code>);
    } else if (match[5] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i${i++}`}>{match[5]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-tail`}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}

export function SafeMarkdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList(key: string) {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key}>
        {listBuffer.map((item, idx) => (
          <li key={idx}>{renderInline(item, `${key}-li${idx}`)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2));
      return;
    }
    flushList(`list-${idx}`);
    if (trimmed.startsWith("## ")) {
      blocks.push(<h3 key={idx}>{renderInline(trimmed.slice(3), `h-${idx}`)}</h3>);
    } else if (trimmed.startsWith("# ")) {
      blocks.push(<h2 key={idx}>{renderInline(trimmed.slice(2), `h-${idx}`)}</h2>);
    } else if (trimmed.length > 0) {
      blocks.push(<p key={idx}>{renderInline(trimmed, `p-${idx}`)}</p>);
    }
  });
  flushList("list-end");

  return <div className="rendered-markdown">{blocks}</div>;
}
