import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDatabasePosts, type BlogPost } from '#/lib/notion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'

const DB_ID = '3210b84b1db480ba87b0fafeff4c2897'

const fetchPosts = createServerFn().handler(async () => {
  const all = await getDatabasePosts(DB_ID)
  return all.filter((p) => p.status === 'Published')
})

export const Route = createFileRoute('/')({
  loader: () => fetchPosts(),
  component: HomePage,
})

function PostCard({ post }: { post: BlogPost }) {
  const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <Link to="/posts/$id" params={{ id: post.id }} className="no-underline">
      <Card className="feature-card h-full cursor-pointer transition hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <CardTitle className="display-title text-xl">{post.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <CardDescription className="text-sm">{formattedDate}</CardDescription>
          <div className="flex flex-wrap justify-end gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function groupByTags(posts: BlogPost[]): [string, BlogPost[]][] {
  const map = new Map<string, BlogPost[]>()

  for (const post of posts) {
    const tags = post.tags.length > 0 ? post.tags : ['Uncategorized']
    for (const tag of tags) {
      if (!map.has(tag)) map.set(tag, [])
      map.get(tag)!.push(post)
    }
  }

  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

function HomePage() {
  const posts = Route.useLoaderData()
  const groups = groupByTags(posts)

  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      <section className="rise-in mb-10">
        <p className="island-kicker mb-2">Blog</p>
        <h1 className="display-title text-4xl font-bold text-gray-900 sm:text-5xl">
          @hanifanmoha
        </h1>
        <p className="mt-3 text-gray-500">
          New articles every week.
        </p>
      </section>

      {posts.length === 0 ? (
        <div className="island-shell rounded-xl p-10 text-center text-gray-400">
          No published posts found.
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map(([tag, tagPosts]) => (
            <section key={tag}>
              <div className="mb-5 flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {tag}
                </h2>
                <span className="island-kicker">{tagPosts.length}</span>
                <Separator className="flex-1" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tagPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

