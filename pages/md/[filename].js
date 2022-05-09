import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Layout from '@/components/layout'
import { getPostByfilename, getAllPosts } from '@/lib/api'
import Head from 'next/head'
import markdownToHtml from '@/lib/markdownToHtml'

export default function Post({ post }) {
  const router = useRouter()
  if (!router.isFallback && !post?.filename) {
    return <ErrorPage statusCode={404} />
  }
  return (
    <Layout>
      {router.isFallback ? (
        <div>Loading…</div>
      ) : (
        <>
          <article>
            <Head>
              <title>
                {post.title}
              </title>
            </Head>
            <h1>{post.title}</h1>
            <div>{post.content}</div>
          </article>
        </>
      )}
    </Layout>
  )
}

export async function getStaticProps({ params }) {
  const post = getPostByfilename(params.filename, [
    'title',
  ])
  const content = await markdownToHtml(post.content || '')

  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  }
}

export async function getStaticPaths() {
  const posts = getAllPosts(['filename'])

  return {
    paths: posts.map((post) => {
      return {
        params: {
          filename: post.filename,
        },
      }
    }),
    fallback: false,
  }
}