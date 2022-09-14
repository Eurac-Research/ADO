import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Layout from '@/components/layout'
import { getPostBySlug, getAllPosts } from '@/lib/api'
import Head from 'next/head'
import markdownToHtml from '@/lib/markdownToHtml'
import markdownStyles from './markdownStyles.module.scss'
import { useThemeContext } from '../../context/theme'
import Image from 'next/image'
import 'external-svg-loader'

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

            {post?.slug === 'about-the-project' && (
              <>
                <h2 style={{ marginTop: '70px' }}>Partner</h2>
                <div className={markdownStyles.partnerLogos}>
                  <a
                    href="https://www.eurac.edu/en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      style={{ paddingLeft: '20px' }}
                      data-src={`https://webassets.eurac.edu/31538/1632322898-eurac-logo-vertical.svg`}
                      width={170}
                      height={130}
                    />
                  </a>
                  <a
                    href="https://www.regione.piemonte.it/web/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1624965085-regionepiemontelogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="200"
                      height="79"
                    />
                  </a>
                  <a
                    href="https://www.arso.gov.si/en/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="99"
                      src="https://webassets.eurac.edu/31538/1624964035-arsologo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="200"
                      height="62"
                    />
                  </a>
                  <a
                    href="https://www.wsl.ch/en/index.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1624969001-wsllogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="157"
                      height="150"
                    />
                  </a>
                  <a
                    href="https://www.land-oberoesterreich.gv.at/default.htm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="99"
                      src="https://webassets.eurac.edu/31538/1624968920-landoberosterreichlogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="199"
                      height="140"
                    />
                  </a>
                  <a
                    href="https://www.kmetijski-zavod.si/en-us/about-us/about-the-institute"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1624964716-kgzmblogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="193"
                      height="150"
                    />
                  </a>
                  <a
                    href="https://www.unr.uni-freiburg.de/en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1624964892-unifreiburglogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="161"
                      height="150"
                    />
                  </a>
                  <a
                    href="https://www.anbi.it/?lang=en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1624963431-anbilogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="200"
                      height="98"
                    />
                  </a>
                  <a
                    href="https://www.inrae.fr/en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1624963435-inrae.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="200"
                      height="107"
                    />
                  </a>
                  <a
                    href="https://www.zamg.ac.at/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1625049129-zamg-logo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="200"
                      height="125"
                    />
                  </a>
                  <a
                    href="https://www.iskriva.net/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      q="80"
                      src="https://webassets.eurac.edu/31538/1630484236-iskriva-logo.jpg?auto=format&fit=clip&fm=png&h=150&w=200"
                      width="200"
                      height="122"
                    />
                  </a>
                </div>
              </>
            )}
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
