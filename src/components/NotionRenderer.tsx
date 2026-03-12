import React from 'react'
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { cn } from '#/lib/utils'

// ---------------------------------------------------------------------------
// Rich text
// ---------------------------------------------------------------------------

function renderRichText(richText: RichTextItemResponse[]): React.ReactNode {
  return richText.map((item, i) => {
    const { bold, italic, strikethrough, underline, code } = item.annotations
    const text = item.plain_text

    if (code) {
      return (
        <code key={i} className="font-mono text-[0.88em]">
          {text}
        </code>
      )
    }

    const href =
      item.type === 'text' && item.text.link ? item.text.link.url : undefined

    let node: React.ReactNode = text
    if (bold) node = <strong key={i}>{node}</strong>
    if (italic) node = <em key={i}>{node}</em>
    if (strikethrough) node = <s key={i}>{node}</s>
    if (underline) node = <u key={i}>{node}</u>
    if (href)
      node = (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      )

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

function CodeBlock({ block }: { block: Block }) {
  if (block.type !== 'code') return null
  const text = block.code.rich_text.map((t) => t.plain_text).join('')
  const lang = block.code.language ?? ''
  return (
    <div className="island-shell my-4 overflow-x-auto rounded-xl p-4">
      {lang && (
        <p className="island-kicker mb-2">{lang}</p>
      )}
      <pre className="text-sm leading-relaxed text-gray-800">
        <code>{text}</code>
      </pre>
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
  return <hr className="my-6 border-none h-px bg-[var(--line)]" />
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
        className="mt-1 accent-[var(--lagoon)]"
      />
      <span className={cn(block.to_do.checked && 'line-through opacity-50 text-gray-400')}>
        {renderRichText(block.to_do.rich_text)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main renderer — groups consecutive list items
// ---------------------------------------------------------------------------

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
      default:
        // unsupported block — skip silently
        break
    }

    i++
  }

  return <div className="space-y-4">{elements}</div>
}
