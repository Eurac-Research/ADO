import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Layout from '@/components/layout'
import { getPostBySlug, getAllPosts } from '@/lib/api'
import Head from 'next/head'
import markdownToHtml from '@/lib/markdownToHtml'
import markdownStyles from './markdownStyles.module.scss'
import { useThemeContext } from '../../context/theme'

export default function Post({ post, morePosts, preview, allPosts }) {
  const router = useRouter()
  const [theme, setTheme] = useThemeContext()

  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }
  return (
    <Layout posts={allPosts} headerMode={1}>
      {router.isFallback ? (
        <div>Loading…</div>
      ) : (
        <div className={markdownStyles.contentBox}>
          <article className={markdownStyles.markdownBody}>
            <Head>
              <title>
                {`${post?.title} - Alpine Drought Observatory | Eurac Research`}
              </title>
            </Head>
            <h1>{post?.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: post?.content }} />
          </article>
        </div>
      )}
    </Layout>
  )
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug, ['title', 'slug', 'content'])
  const content = await markdownToHtml(post.content || '')

  const allPosts = getAllPosts(['title', 'slug'])

  return {
    props: {
      post: {
        ...post,
        content,
      },
      allPosts,
    },
  }
}

export async function getStaticPaths() {
  const posts = getAllPosts(['slug'])

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      }
    }),
    fallback: false,
  }
}
