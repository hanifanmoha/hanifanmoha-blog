import React from 'react'
import type {
  BlockObjectResponse,
  RichTextItemResponse,
  TableRowBlockObjectResponse,
  TableBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { cn } from '#/lib/utils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

// ---------------------------------------------------------------------------
// Rich text
// ---------------------------------------------------------------------------

// Notion page URLs end with a 32-char hex ID, e.g.:
//   https://www.notion.so/Some-Title-3250b84b1db4801da492dfef632ee42f
// Rewrite those to internal post routes.
function resolveHref(url: string): { href: string; internal: boolean; name?: string } {
  const notionPagePattern = /^https?:\/\/(?:www\.)?notion\.so\/(?:([^/]+?)-)?([0-9a-f]{32})$/i
  const match = url.match(notionPagePattern)
  if (match) {
    const slug = match[1]
    const raw = match[2]
    const uuid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
    const name = slug ? slug.replace(/-/g, ' ') : 'Link'
    return { href: `/posts/${uuid}`, internal: true, name }
  }
  return { href: url, internal: false }
}

function renderRichText(richText: RichTextItemResponse[]): React.ReactNode {
  return richText.map((item, i) => {
    const { bold, italic, strikethrough, underline, code } = item.annotations
    const text = item.plain_text

    if (code) {
      return (
        <code key={i} className="font-mono text-[0.88em] bg-gray-100 !text-pink-600 !px-1.5 !py-0.5 rounded">
          {text}
        </code>
      )
    }

    const rawHref =
      item.type === 'text' && item.text.link ? item.text.link.url : undefined

    let node: React.ReactNode = text
    if (bold) node = <strong key={i}>{node}</strong>
    if (italic) node = <em key={i}>{node}</em>
    if (strikethrough) node = <s key={i}>{node}</s>
    if (underline) node = <u key={i}>{node}</u>
    if (rawHref) {
      const { href, internal, name } = resolveHref(rawHref)
      const label = internal ? (name ?? 'Link') : node
      node = internal ? (
        <a key={i} href={href} className="text-blue-600 underline hover:text-blue-800">{label}</a>
      ) : (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{label}</a>
      )
    }

    return <React.Fragment key={i}>{node}</React.Fragment>
  })
}

// ---------------------------------------------------------------------------
// Individual block renderers
// ---------------------------------------------------------------------------

type Block = BlockObjectResponse

function Paragraph({ block }: { block: Block }) {
  if (block.type !== 'paragraph') return null
  const content = renderRichText(block.paragraph.rich_text)
  if (!block.paragraph.rich_text.length) return <div className="h-4" />
  return (
    <p className="leading-relaxed text-gray-600">{content}</p>
  )
}

function Heading1({ block }: { block: Block }) {
  if (block.type !== 'heading_1') return null
  return (
    <h1 className="display-title mt-8 mb-3 text-3xl font-bold text-gray-900">
      {renderRichText(block.heading_1.rich_text)}
    </h1>
  )
}

function Heading2({ block }: { block: Block }) {
  if (block.type !== 'heading_2') return null
  return (
    <h2 className="display-title mt-6 mb-2 text-2xl font-semibold text-gray-900">
      {renderRichText(block.heading_2.rich_text)}
    </h2>
  )
}

function Heading3({ block }: { block: Block }) {
  if (block.type !== 'heading_3') return null
  return (
    <h3 className="mt-5 mb-2 text-xl font-semibold text-gray-900">
      {renderRichText(block.heading_3.rich_text)}
    </h3>
  )
}

function BulletedList({ items }: { items: Block[] }) {
  return (
    <ul className="my-3 ml-5 list-disc space-y-1.5 text-gray-600">
      {items.map((block) => {
        if (block.type !== 'bulleted_list_item') return null
        return (
          <li key={block.id}>{renderRichText(block.bulleted_list_item.rich_text)}</li>
        )
      })}
    </ul>
  )
}

function NumberedList({ items }: { items: Block[] }) {
  return (
    <ol className="my-3 ml-5 list-decimal space-y-1.5 text-gray-600">
      {items.map((block) => {
        if (block.type !== 'numbered_list_item') return null
        return (
          <li key={block.id}>{renderRichText(block.numbered_list_item.rich_text)}</li>
        )
      })}
    </ol>
  )
}

function MermaidCodeBlock({ text }: { text: string }) {
  const encoded = btoa(unescape(encodeURIComponent(text)))
  const src = `https://mermaid.ink/svg/${encoded}`
  return (
    <div className="island-shell my-4 rounded-xl p-4">
      <p className="island-kicker mb-2">mermaid</p>
      <div className="flex justify-center">
        <img src={src} alt="Mermaid diagram" className="max-w-2/3" />
      </div>
      <details className="mt-3 group">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-gray-400 hover:text-gray-600">
          <span className="select-none transition-transform duration-200 group-open:rotate-90">▶</span>
          View source
        </summary>
        <div className="mt-2 overflow-x-auto">
          <SyntaxHighlighter
            language="mermaid"
            style={oneLight}
            customStyle={{ margin: 0, background: 'transparent', fontSize: '0.875rem', lineHeight: '1.25rem' }}
          >
            {text}
          </SyntaxHighlighter>
        </div>
      </details>
    </div>
  )
}

function CodeBlock({ block }: { block: Block }) {
  if (block.type !== 'code') return null
  const text = block.code.rich_text.map((t) => t.plain_text).join('')
  const lang = block.code.language ?? ''

  if (lang === 'mermaid') return <MermaidCodeBlock text={text} />

  return (
    <div className="island-shell my-4 overflow-x-auto rounded-xl p-4 bg-gray-100!">
      {lang && (
        <p className="island-kicker mb-2">{lang}</p>
      )}
      <SyntaxHighlighter
        language={lang || 'text'}
        style={oneLight}
        customStyle={{ margin: 0, background: 'transparent', fontSize: '0.875rem', lineHeight: '1.25rem' }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  )
}

function QuoteBlock({ block }: { block: Block }) {
  if (block.type !== 'quote') return null
  return (
    <blockquote className="my-4 border-l-4 border-gray-300 pl-4 italic text-gray-500">
      {renderRichText(block.quote.rich_text)}
    </blockquote>
  )
}

function DividerBlock() {
  return <hr className="my-6 border-none h-px bg-(--line)" />
}

function ImageBlock({ block }: { block: Block }) {
  if (block.type !== 'image') return null
  const src =
    block.image.type === 'external'
      ? block.image.external.url
      : block.image.file.url
  const caption =
    block.image.caption?.map((t) => t.plain_text).join('') ?? ''
  return (
    <figure className="my-6">
      <img
        src={src}
        alt={caption || 'Blog image'}
        className="w-full rounded-xl object-cover"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-400">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function CalloutBlock({ block }: { block: Block }) {
  if (block.type !== 'callout') return null
  const emoji =
    block.callout.icon?.type === 'emoji' ? block.callout.icon.emoji : '💡'
  return (
    <div className="island-shell my-4 flex gap-3 rounded-xl p-4">
      <span className="text-xl">{emoji}</span>
      <p className="leading-relaxed text-gray-600">
        {renderRichText(block.callout.rich_text)}
      </p>
    </div>
  )
}

function ToDoBlock({ block }: { block: Block }) {
  if (block.type !== 'to_do') return null
  return (
    <div className="my-1.5 flex items-start gap-2 text-gray-600">
      <input
        type="checkbox"
        checked={block.to_do.checked}
        readOnly
        className="mt-1 accent-(--lagoon)"
      />
      <span className={cn(block.to_do.checked && 'line-through opacity-50 text-gray-400')}>
        {renderRichText(block.to_do.rich_text)}
      </span>
    </div>
  )
}

function ToggleBlock({ block }: { block: Block }) {
  if (block.type !== 'toggle') return null
  const children: Block[] = (block as any).children ?? []
  return (
    <details className="my-2 group">
      <summary className="flex cursor-pointer list-none items-start gap-2 font-medium text-gray-800 hover:text-gray-600">
        <span className="mt-0.5 select-none transition-transform duration-200 group-open:rotate-90">▶</span>
        <span>{renderRichText(block.toggle.rich_text)}</span>
      </summary>
      {children.length > 0 && (
        <div className="mt-2 pl-6">
          <NotionRenderer blocks={children} />
        </div>
      )}
    </details>
  )
}

// ---------------------------------------------------------------------------
// Main renderer — groups consecutive list items
// ---------------------------------------------------------------------------

function TableFromRows({ rows }: { rows: TableRowBlockObjectResponse[] }) {
  if (!rows.length) return null
  return (
    <div className="my-6 overflow-x-auto">
      <table className="min-w-full table-fixed border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="odd:bg-white even:bg-gray-50">
              {row.table_row.cells.map((cell, idx) => (
                <td key={idx} className="border px-3 py-2 align-top text-gray-600">
                  {renderRichText(cell as RichTextItemResponse[])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableBlock({ block }: { block: TableBlockObjectResponse }) {
  if (block.type !== 'table') return null
  const children: Block[] = (block as any).children ?? []
  const rows = children.filter((b) => b.type === 'table_row') as TableRowBlockObjectResponse[]
  const hasColumnHeader = !!block.table?.has_column_header
  if (!rows.length) return null

  return (
    <div className="my-6 overflow-x-auto">
      <table className="min-w-full table-fixed border-collapse text-sm">
        {hasColumnHeader && rows[0] && (
          <thead className="bg-gray-50">
            <tr>
              {rows[0].table_row.cells.map((cell, i) => (
                <th key={i} className="border px-3 py-2 text-left font-medium text-gray-700">
                  {renderRichText(cell as RichTextItemResponse[])}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.slice(hasColumnHeader ? 1 : 0).map((row) => (
            <tr key={row.id} className="odd:bg-white even:bg-gray-50">
              {row.table_row.cells.map((cell, i) => (
                <td key={i} className="border px-3 py-2 align-top text-gray-600">
                  {renderRichText(cell as RichTextItemResponse[])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function NotionRenderer({ blocks }: { blocks: Block[] }) {
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    if (block.type === 'bulleted_list_item') {
      const group: Block[] = []
      while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
        group.push(blocks[i++])
      }
      elements.push(<BulletedList key={group[0].id} items={group} />)
      continue
    }

    if (block.type === 'numbered_list_item') {
      const group: Block[] = []
      while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
        group.push(blocks[i++])
      }
      elements.push(<NumberedList key={group[0].id} items={group} />)
      continue
    }

    if (block.type === 'table_row') {
      const group: TableRowBlockObjectResponse[] = []
      while (i < blocks.length && blocks[i].type === 'table_row') {
        group.push(blocks[i++] as TableRowBlockObjectResponse)
      }
      elements.push(<TableFromRows key={group[0].id} rows={group} />)
      continue
    }

    switch (block.type) {
      case 'paragraph':
        elements.push(<Paragraph key={block.id} block={block} />)
        break
      case 'heading_1':
        elements.push(<Heading1 key={block.id} block={block} />)
        break
      case 'heading_2':
        elements.push(<Heading2 key={block.id} block={block} />)
        break
      case 'heading_3':
        elements.push(<Heading3 key={block.id} block={block} />)
        break
      case 'code':
        elements.push(<CodeBlock key={block.id} block={block} />)
        break
      case 'quote':
        elements.push(<QuoteBlock key={block.id} block={block} />)
        break
      case 'divider':
        elements.push(<DividerBlock key={block.id} />)
        break
      case 'image':
        elements.push(<ImageBlock key={block.id} block={block} />)
        break
      case 'callout':
        elements.push(<CalloutBlock key={block.id} block={block} />)
        break
      case 'to_do':
        elements.push(<ToDoBlock key={block.id} block={block} />)
        break
      case 'toggle':
        elements.push(<ToggleBlock key={block.id} block={block} />)
        break
      case 'table':
        elements.push(<TableBlock key={block.id} block={block} />)
        break
      default:
        // unsupported block — skip silently
        break
    }

    i++
  }

  return <div className="space-y-4">{elements}</div>
}
