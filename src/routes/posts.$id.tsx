import { createFileRoute, Link } from '@tanstack/react-router'
import {
  getPage,
  getPageBlocks,
  extractTitle,
  extractCreatedTime,
} from '#/lib/notion'
import { NotionRenderer } from '#/components/NotionRenderer'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'

export const Route = createFileRoute('/posts/$id')({
  loader: async ({ params }) => {
    const [page, blocks] = await Promise.all([
      getPage(params.id),
      getPageBlocks(params.id),
    ])
    return {
      title: extractTitle(page),
      createdAt: extractCreatedTime(page),
      blocks,
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.title || 'Post'} | @hanifanmoha`,
      },
    ],
  }),
  component: PostPage,
})

function PostPage() {
  const { title, createdAt, blocks } = Route.useLoaderData()

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 no-underline hover:text-gray-600"
        >
          ← All posts
        </Link>

        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
            <CardDescription className="mt-2 text-sm">
              {formattedDate}
            </CardDescription>
          </CardHeader>

          <div className="px-6">
            <Separator />
          </div>

          <CardContent className="pt-6">
            <NotionRenderer blocks={blocks} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
