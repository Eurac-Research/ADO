'use client'

import { useThemeContext } from '@/context/theme'
import Layout from '@/components/layout'
import Image from 'next/image'
import type { PostData } from '@/types'

interface MarkdownContentProps {
  post: any
  content: string
  posts: PostData[]
}

export default function MarkdownContent({ post, content, posts }: MarkdownContentProps) {
  const [theme] = useThemeContext()

  return (
    <Layout posts={posts} headerMode={1}>
      <div className="mx-auto px-5 py-36 min-h-screen md:max-w-4xl md:px-0 md:pt-36 bg-white dark:bg-gray-900">
        <div className="prose prose-lg max-w-none dark:prose-invert bg-white dark:bg-gray-900
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-900
          dark:prose-headings:text-gray-100
          prose-h1:text-3xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3 prose-h1:mt-6 prose-h1:mb-4
          dark:prose-h1:border-gray-700
          prose-h2:text-2xl prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h2:mt-6 prose-h2:mb-4
          dark:prose-h2:border-gray-700
          prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-4
          prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-3
          prose-h5:text-base prose-h5:mt-4 prose-h5:mb-3
          prose-h6:text-sm prose-h6:mt-4 prose-h6:mb-3 prose-h6:text-gray-600
          dark:prose-h6:text-gray-400
          prose-p:leading-relaxed prose-p:text-gray-700 prose-p:mb-4 prose-p:mt-0
          dark:prose-p:text-gray-300
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300
          prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:bg-gray-50
          prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:text-gray-600 prose-blockquote:my-4
          dark:prose-blockquote:bg-gray-800 dark:prose-blockquote:text-gray-300
          dark:prose-blockquote:border-gray-600
          prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded
          prose-code:text-sm prose-code:font-mono prose-code:text-gray-800
          dark:prose-code:bg-gray-800 dark:prose-code:text-gray-200
          prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-md
          prose-pre:p-4 prose-pre:overflow-auto prose-pre:text-sm prose-pre:leading-relaxed
          dark:prose-pre:bg-gray-800 dark:prose-pre:border-gray-700 dark:prose-pre:text-gray-200
          prose-table:border-collapse prose-table:w-full prose-table:my-4
          prose-th:bg-gray-50 prose-th:font-semibold prose-th:text-left prose-th:text-gray-900
          prose-th:border prose-th:border-gray-200 prose-th:px-3 prose-th:py-2
          dark:prose-th:bg-gray-800 dark:prose-th:text-gray-100 dark:prose-th:border-gray-600
          prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2 prose-td:text-gray-700
          dark:prose-td:border-gray-600 dark:prose-td:text-gray-300
          prose-tr:even:bg-gray-50 dark:prose-tr:even:bg-gray-800/50
          prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full prose-img:h-auto
          prose-hr:border-gray-300 prose-hr:my-8 prose-hr:border-t prose-hr:rounded
          dark:prose-hr:border-gray-600
          prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4
          prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4
          prose-li:my-1 prose-li:text-gray-700
          dark:prose-li:text-gray-300
          prose-strong:text-gray-900 dark:prose-strong:text-gray-100
          prose-em:text-gray-700 dark:prose-em:text-gray-300">

          <h1 className="mb-8 text-4xl font-bold tracking-tight text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-4">
            {post.title}
          </h1>

          <div
            className="markdown-content bg-white dark:bg-gray-900"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
        <div>

          {/* Partner Logos Section for About the Project page */}
          {post?.slug === 'about-the-project' && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 mt-16 mb-6">
                Partner
              </h2>
              <div className="flex flex-wrap justify-center items-center gap-6 pb-20">
                <a
                  href="https://www.eurac.edu/en"
                  target="_blank"
                  rel="noreferrer"
                  className=""
                >
                  <div className="flex items-center justify-center">
                    <svg
                      width="170"
                      height="130"
                      className="pl-5 fill-[#df1b12]"
                      viewBox="0 0 127.852 45.894"
                    >
                      <path
                        d="M110.784,55.394c.88-.035,2.215-.1,3.588-.1,1.336,0,2.779.069,3.658.1v-.985l-1.161-.175c-.774-.141-1.16-.351-1.16-2.813V41.257a8.02,8.02,0,0,1,4.079-1.371c2.99,0,3.693,1.652,3.693,4.325v7.21c0,2.462-.351,2.672-1.16,2.813l-1.16.175v.985c.879-.035,2.215-.1,3.587-.1,1.336,0,2.779.069,3.657.1v-.985l-1.16-.175c-.774-.141-1.16-.351-1.16-2.813v-7.6c0-3.552-1.2-6.013-5.345-6.013a8.161,8.161,0,0,0-5.029,2.285v-9.6a25.938,25.938,0,0,1-4.888,1.9v.845c2.286.457,2.286.879,2.286,2.673v15.51c0,2.462-.351,2.672-1.16,2.813l-1.161.175Zm-8.475.422c2.6,0,4.572-1.2,5.206-2.251l-.177-.913a7.42,7.42,0,0,1-4.079,1.09c-3.658,0-6.225-2.5-6.225-7,0-4.678,2.5-7.42,5.486-7.42,2.5,0,3.307,1.336,3.411,3.34h1.336c0-1.16.035-2.849.141-4.008a13.906,13.906,0,0,0-4.677-.844c-4.607,0-8.441,4.044-8.441,9.284,0,5.346,2.989,8.722,8.018,8.722m-20.784-.422c.879-.035,2.215-.141,3.587-.141,1.336,0,3.236.106,4.115.141v-.985l-1.617-.175c-.774-.106-1.162-.351-1.162-2.813V41.469a6.131,6.131,0,0,1,3.728-1.337,5.289,5.289,0,0,1,1.935.317l.282-2.427a5.787,5.787,0,0,0-1.513-.21,6.6,6.6,0,0,0-4.431,2.461V37.634a34.807,34.807,0,0,1-4.888,1.689v.844c2.287.457,2.287.879,2.287,2.673v8.581c0,2.462-.353,2.672-1.162,2.813l-1.16.175Zm-12.2-1.617A2.651,2.651,0,0,1,66.439,51c0-2.145,1.617-3.447,5.239-3.447.388,0,.986,0,1.372.036-.035.738-.105,3.376-.105,4.642a4.856,4.856,0,0,1-3.623,1.548m-.949,2.039a5.875,5.875,0,0,0,4.677-2.391h.071a2.3,2.3,0,0,0,2.567,2.391,5.358,5.358,0,0,0,2.673-.633V54.2c-2.146,0-2.779-.492-2.779-2.215,0-3.166.141-5.839.141-8.581,0-3.412-1.97-5.592-5.944-5.592a7.034,7.034,0,0,0-4.818,2l.176,1.02a8.141,8.141,0,0,1,4.01-.948c2.742,0,3.938,1.442,3.938,4.149v2.041c-.528-.035-1.408-.035-1.9-.035-4.5,0-7.421,2.11-7.421,5.415a4.3,4.3,0,0,0,4.607,4.361M49.981,44.351c.281-2.391,1.758-4.993,4.713-4.993,2.461,0,3.691,2.145,3.691,4.22,0,.491-.21.772-.808.772ZM55.01,55.817c2.532,0,4.747-1.09,5.415-2.18l-.105-.88a10.242,10.242,0,0,1-4.642.986c-3.939,0-5.838-3.165-5.838-6.963,0-.317,0-.669.035-1.02H61.234a7.531,7.531,0,0,0,.072-1.267c0-3.411-2.111-6.681-6.472-6.681-4.572,0-7.772,3.939-7.772,9.284,0,5.381,2.779,8.722,7.949,8.722m-17.69,0c3.517,0,6.084-2.356,6.084-5.17,0-6.3-8.863-4.606-8.863-8.687,0-1.792,1.372-2.708,3.482-2.708,2.356,0,3.411,1.161,3.587,3.411h1.3a29.419,29.419,0,0,1-.07-3.939,13.6,13.6,0,0,0-4.678-.913c-3.411,0-5.943,1.829-5.943,4.642,0,6.365,8.827,4.22,8.827,8.616,0,1.969-1.548,3.2-3.763,3.2-2.99,0-3.728-1.371-4.044-3.868h-1.3a40.4,40.4,0,0,1,.105,4.607,16.65,16.65,0,0,0,5.275.808M17.379,44.351c.281-2.391,1.759-4.993,4.713-4.993,2.461,0,3.692,2.145,3.692,4.22,0,.491-.211.772-.809.772Zm5.029,11.465c2.532,0,4.748-1.09,5.417-2.18l-.107-.88a10.242,10.242,0,0,1-4.642.986c-3.938,0-5.838-3.165-5.838-6.963,0-.317,0-.669.035-1.02h11.36a7.674,7.674,0,0,0,.07-1.267c0-3.411-2.11-6.681-6.47-6.681-4.573,0-7.773,3.939-7.773,9.284,0,5.381,2.779,8.722,7.948,8.722M1.7,55.394c.879-.035,2.215-.141,3.587-.141,1.337,0,3.236.106,4.115.141v-.985l-1.618-.175c-.774-.106-1.16-.351-1.16-2.813V41.469a6.129,6.129,0,0,1,3.728-1.337,5.288,5.288,0,0,1,1.934.317l.282-2.427a5.782,5.782,0,0,0-1.512-.21,6.6,6.6,0,0,0-4.431,2.461V37.634A34.845,34.845,0,0,1,1.73,39.323v.844c2.287.457,2.287.879,2.287,2.673v8.581c0,2.462-.353,2.672-1.162,2.813l-1.16.175Z"
                        transform="translate(-0.552 -9.923)"
                      ></path>
                      <path d="M87.8,19.038a13.177,13.177,0,0,0,4.779-.859V12.953a7.728,7.728,0,0,1-4.255,1.008c-2.2,0-3.509-1.493-3.509-4.255,0-3.359,1.418-4.7,3.472-4.7a10.825,10.825,0,0,1,3.994.784V.672A15.6,15.6,0,0,0,87.649,0c-6.5,0-9.856,4.143-9.856,9.705,0,5.786,3.062,9.332,10,9.332M65.662,14.521c-1.045,0-1.717-.336-1.717-1.382,0-1.231.672-1.717,2.539-1.717a6.846,6.846,0,0,1,.821.038v2.352a2.258,2.258,0,0,1-1.643.709m-2.277,4.517A5.459,5.459,0,0,0,68.2,16.723c.71,1.456,2.054,2.315,4.367,2.315a5.257,5.257,0,0,0,3.1-.747V14.148a3.759,3.759,0,0,1-.6.075c-.746,0-1.045-.448-1.045-1.307V7.167C74.023,2.277,71.6,0,65.624,0a19.24,19.24,0,0,0-6.158.933V5.9a19.243,19.243,0,0,1,5-.784c2.016,0,2.837.709,2.837,2.24v.6c-.261,0-.561-.037-1.194-.037-5.04,0-8.7,1.419-8.7,5.637,0,3.845,2.651,5.487,5.974,5.487m-20.121-.3h6.719V6.719a9.591,9.591,0,0,1,4.031-.933,8.442,8.442,0,0,1,2.053.224V.186A4.511,4.511,0,0,0,54.575,0a6.272,6.272,0,0,0-4.74,2.24V.3h-6.57Zm-15.939.3a7.837,7.837,0,0,0,5.04-1.755v1.456H38.9V.3h-6.72V12.879a3.921,3.921,0,0,1-2.24.97c-1.344,0-2.016-.6-2.016-2.277V.3H21.165V12.58c0,3.7,1.606,6.458,6.16,6.458M7.017,7.391c.075-1.307.635-2.65,2.24-2.65,1.419,0,2.016,1.231,2.016,2.427v.224Zm3.136,11.647a18.1,18.1,0,0,0,6.271-1.045V13.027a15.442,15.442,0,0,1-5.711,1.121c-2.986,0-3.7-1.121-3.808-3.136H17.694a17.525,17.525,0,0,0,.112-1.979C17.806,4.292,15.753,0,9.22,0,2.949,0,0,4.591,0,9.481c0,5.6,2.8,9.556,10.153,9.556"></path>
                    </svg>
                  </div>
                </a>

                <a href="https://www.kmetijski-zavod.si/en-us/about-us/about-the-institute" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="KGZM-B" src="https://webassets.eurac.edu/31538/1763118611-kgzmb-logo.svg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.dia4s.fr/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="DIA4S" src="https://webassets.eurac.edu/31538/1763118900-dia4s-fr.svg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.geosphere.at/de" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="GeoSphere Austria" src="https://webassets.eurac.edu/31538/1727259358-geosphere-logo.svg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.lmu.de/en/index.html" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="LMU Munich" src="https://webassets.eurac.edu/31538/1662112761-logo_lmu.svg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://cf.regione.vda.it/it/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="Centro Funzionale Valle d'Aosta" src="https://webassets.eurac.edu/31538/1732792788-centro-funzionale-aosta_logo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.cimafoundation.org/en/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="CIMA Research Foundation" src="https://webassets.eurac.edu/31538/1727259515-cima_research_foundation_logo.jpeg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://lessem.lyon-grenoble.hub.inrae.fr/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="LESSEM" src="https://webassets.eurac.edu/31538/1763119542-4e8cc0fc3d94-lessem_couleur-1.png?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.cee.ed.tum.de/cee/startseite/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="TU Munich" src="https://webassets.eurac.edu/31538/1636727308-tumtechnische-universitaet-muenchen-munic-logo.gif?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.tuwien.at/mg/geo" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="TU Wien" src="https://webassets.eurac.edu/31538/1697190437-tu-wien_logo.png?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.uni-lj.si/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="University of Ljubljana" src="https://webassets.eurac.edu/31538/1697190577-ljubljana-university_logo.png?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={150} className="max-h-24 w-auto object-contain" />
                </a>




                <a href="https://www.regione.piemonte.it/web/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="Regione Piemonte" src="https://webassets.eurac.edu/31538/1624965085-regionepiemontelogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={79} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.arso.gov.si/en/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="ARSO" src="https://webassets.eurac.edu/31538/1624964035-arsologo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={62} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.wsl.ch/en/index.html" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="WSL" src="https://webassets.eurac.edu/31538/1624969001-wsllogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={157} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.land-oberoesterreich.gv.at/default.htm" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="Land Oberösterreich" src="https://webassets.eurac.edu/31538/1624968920-landoberosterreichlogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={199} height={140} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.kmetijski-zavod.si/en-us/about-us/about-the-institute" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="KGZM-B" src="https://webassets.eurac.edu/31538/1624964716-kgzmblogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={193} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.unr.uni-freiburg.de/en" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="University of Freiburg" src="https://webassets.eurac.edu/31538/1624964892-unifreiburglogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={161} height={150} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.anbi.it/?lang=en" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="ANBI" src="https://webassets.eurac.edu/31538/1624963431-anbilogo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={98} className="max-h-24 w-auto object-contain" />
                </a>

                <a href="https://www.inrae.fr/en" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="INRAE" src="https://webassets.eurac.edu/31538/1624963435-inrae.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={107} className="max-h-24 w-auto object-contain" />
                </a>

                {/* <a href="https://www.zamg.ac.at/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="ZAMG" src="https://webassets.eurac.edu/31538/1625049129-zamg-logo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={125} className="max-h-24 w-auto object-contain" />
                </a> */}

                <a href="https://www.iskriva.net/" target="_blank" rel="noreferrer" className="">
                  <Image unoptimized alt="Iskriva" src="https://webassets.eurac.edu/31538/1630484236-iskriva-logo.jpg?auto=format&fit=clip&fm=png&h=150&w=200" width={200} height={122} className="max-h-24 w-auto object-contain" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
