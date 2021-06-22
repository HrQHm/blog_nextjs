/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import Head from 'next/head';
import { GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import { useMemo } from 'react';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import UtterancesComments from '../../components/UtterancesComments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  uid?: string;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  nextPost: Post | null;
  prevPost: Post | null;
  preview: boolean;
}

export default function Post({ post, nextPost, prevPost, preview }: PostProps) {
  const router = useRouter();

  const timeToRead = useMemo(() => {
    if (router.isFallback) {
      return 0;
    }

    let fullText = '';
    const readWordsPerMinute = 200;

    post.data.content.forEach(postContent => {
      fullText += postContent.heading;
      fullText += RichText.asText(postContent.body);
    });

    const time = Math.ceil(fullText.split(/\s/g).length / readWordsPerMinute);

    return time;
  }, [post, router.isFallback]);

  const isEditedPost = useMemo(() => {
    if (router.isFallback) {
      return false;
    }

    return post.last_publication_date !== post.first_publication_date;
  }, [post, router.isFallback]);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <div className={commonStyles.container}>
      <Head>
        <title>{post.data.title} | spacetraveling.</title>
      </Head>

      <main className={styles.content}>
        <div className={styles.banner}>
          <img src={post.data.banner.url} alt="image_post" />
        </div>
        <h1 className={styles.title}>{post.data.title}</h1>
        <div className={commonStyles.info}>
          <time>
            <FiCalendar />
            {format(new Date(post.first_publication_date), 'd LLL YYY', {
              locale: ptBR,
            })}
          </time>
          <span>
            <FiUser />
            {post.data.author}
          </span>
          <span>
            <FiClock />
            {timeToRead} min
          </span>
        </div>

        {isEditedPost && (
          <div className={styles.postEdited}>
            <span>
              * editado em{' '}
              <time>
                {format(new Date(post.last_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </time>
              , às{' '}
              <time>
                {format(
                  new Date(post.last_publication_date),
                  `${'HH'}:${'mm'}`,
                  {
                    locale: ptBR,
                  }
                )}
              </time>
            </span>
          </div>
        )}

        {post.data.content.map((content, index) => {
          return (
            <section key={index}>
              <h2>{content.heading}</h2>
              <div className={styles.bodyContent}>
                {content.body.map((body, index) => (
                  <p
                    key={index}
                    dangerouslySetInnerHTML={{ __html: body.text }}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <footer className={styles.navContainer}>
          <div>
            {prevPost && (
              <Link href={`/post/${prevPost.uid}`}>
                <a>
                  <h4>{prevPost.data.title}</h4>
                  <span>Post anterior</span>
                </a>
              </Link>
            )}
          </div>
          <div>
            {nextPost && (
              <Link href={`/post/${nextPost.uid}`}>
                <a>
                  <h4>{nextPost.data.title}</h4>
                  <span>Próximo post</span>
                </a>
              </Link>
            )}
          </div>
        </footer>
        <UtterancesComments />
        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </div>
  );
}

export const getStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
    }
  );

  return {
    paths: posts.results.map(post => {
      return {
        params: { slug: post.uid },
      };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });
  // console.log(JSON.stringify(response, null, 2));

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    ref: previewData?.ref ?? null,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: content.body.map(body => {
            return {
              text: body.text,
              type: body.type,
              spans:
                body.spans.length > 0
                  ? body.spans.map(span => {
                      return span.data
                        ? {
                            start: span.start,
                            end: span.end,
                            type: span.type,
                            data: span.data,
                          }
                        : {
                            start: span.start,
                            end: span.end,
                            type: span.type,
                          };
                    })
                  : [],
            };
          }),
        };
      }),
    },
  };

  const nextPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date]',
      after: response.id,
    }
  );

  const prevPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date desc]',
      after: response.id,
    }
  );

  return {
    props: {
      post,
      nextPost: nextPost.results[0] ?? null,
      prevPost: prevPost.results[0] ?? null,
      preview,
    },
    redirect: 60 * 30, // 30 minutes
  };
};
