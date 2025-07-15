import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPosts } from '@/lib/api'
import markdownToHtml from '@/lib/markdownToHtml'
import MarkdownContent from './markdown-content'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

interface MarkdownPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  const posts = getAllPosts(['slug']) as Array<{ slug: string }>
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: MarkdownPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug, ['title', 'excerpt']) as { title: string; excerpt?: string } | null
  
  if (!post) {
    return {
      title: 'Page Not Found - Alpine Drought Observatory',
    }
  }
  
  return {
    title: `${post.title} - Alpine Drought Observatory | Eurac Research`,
    description: post.excerpt || `${post.title} - Alpine Drought Observatory`,
  }
}

export default async function MarkdownPage({ params }: MarkdownPageProps) {
  const { slug } = await params
  
  const post = getPostBySlug(slug, [
    'title',
    'date',
    'slug',
    'author',
    'content',
    'ogImage',
    'coverImage',
  ]) as any

  if (!post) {
    notFound()
  }

  const allPosts = getAllPosts(['title', 'slug']) as PostData[]
  const content = await markdownToHtml(post.content || '')

  return (
    <MarkdownContent
      post={post}
      content={content}
      posts={allPosts}
    />
  )
}
