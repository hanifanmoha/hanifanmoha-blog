import dns from 'dns'
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'

// Force IPv4 to avoid undici ETIMEDOUT on IPv6 for api.notion.com
dns.setDefaultResultOrder('ipv4first')

function getKey() {
  const key = process.env.NOTION_API_KEY
  if (!key) throw new Error('Missing NOTION_API_KEY environment variable')
  return key
}

function notionHeaders() {
  return {
    Authorization: `Bearer ${getKey()}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }
}

async function notionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: notionHeaders(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion API error ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

export async function getPage(pageId: string): Promise<PageObjectResponse> {
  return notionFetch<PageObjectResponse>(`/pages/${pageId}`)
}

export async function getPageBlocks(
  pageId: string,
): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = []
  let cursor: string | undefined = undefined

  do {
    const params = new URLSearchParams({ page_size: '100' })
    if (cursor) params.set('start_cursor', cursor)
    const response = await notionFetch<{
      results: BlockObjectResponse[]
      has_more: boolean
      next_cursor: string | null
    }>(`/blocks/${pageId}/children?${params}`)
    blocks.push(...response.results)
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  // For blocks that have children (tables, toggles, etc.), fetch their children
  async function fetchChildrenForBlock(block: BlockObjectResponse) {
    if (!block.has_children) return

    const children: BlockObjectResponse[] = []
    let childCursor: string | undefined = undefined

    do {
      const params = new URLSearchParams({ page_size: '100' })
      if (childCursor) params.set('start_cursor', childCursor)
      const response = await notionFetch<{
        results: BlockObjectResponse[]
        has_more: boolean
        next_cursor: string | null
      }>(`/blocks/${block.id}/children?${params}`)
      children.push(...response.results)
      childCursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
    } while (childCursor)

    // Recursively fetch grandchildren
    for (const child of children) {
      await fetchChildrenForBlock(child)
    }

    ;(block as any).children = children
  }

  // Fetch children for each top-level block that has children
  for (const block of blocks) {
    if (block.has_children) await fetchChildrenForBlock(block)
  }

  return blocks
}

export function extractTitle(page: PageObjectResponse): string {
  const props = page.properties
  for (const key of Object.keys(props)) {
    const prop = props[key]
    if (prop.type === 'title' && prop.title.length > 0) {
      return prop.title.map((t: RichTextItemResponse) => t.plain_text).join('')
    }
  }
  return 'Untitled'
}

export function extractCreatedTime(page: PageObjectResponse): string {
  return page.created_time
}

export interface BlogPost {
  id: string
  title: string
  tags: string[]
  status: string
  createdAt: string
  slug: string
}

export async function getDatabasePosts(
  databaseId: string,
): Promise<BlogPost[]> {
  const key = process.env.NOTION_API_KEY
  if (!key) throw new Error('Missing NOTION_API_KEY environment variable')

  const res = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion API error ${res.status}: ${err}`)
  }

  const response = (await res.json()) as { results: PageObjectResponse[] }

  return (response.results as PageObjectResponse[])
    .filter((page): page is PageObjectResponse => page.object === 'page')
    .map((page) => {
      const props = page.properties

      const titleProp = Object.values(props).find((p) => p.type === 'title')
      const title =
        titleProp?.type === 'title'
          ? titleProp.title.map((t) => t.plain_text).join('')
          : 'Untitled'

      const tagsProp = props['Tags']
      const tags =
        tagsProp?.type === 'multi_select'
          ? tagsProp.multi_select.map((t) => t.name)
          : []

      const statusProp = props['Blog Status']
      const status =
        statusProp?.type === 'select' ? (statusProp.select?.name ?? '') : ''

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      return {
        id: page.id,
        title,
        tags,
        status,
        createdAt: page.created_time,
        slug,
      }
    })
}
