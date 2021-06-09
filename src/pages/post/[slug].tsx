import Head from 'next/head';
import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { getPrismicClient } from '../../services/prismic';
import Prismic from "@prismicio/client"
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import { RichText } from "prismic-dom";
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  const timeToRead = post.data.content.reduce((time: number, content) => {
    const words = RichText.asText(content.body).split(' ').length;
    time += Math.ceil(words / 200);
    return time;
  }, 0);

  if (router.isFallback) {
    return (
      <div>Carregando...</div>
    );
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
            <FiCalendar />{
              format(
                new Date(post.first_publication_date),
                'd LLL YYY',
                { locale: ptBR }
              )
            }
          </time>
          <span><FiUser />{post.data.author}</span>
          <span><FiClock />{timeToRead} min</span>
        </div>

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
          )
        })}


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

export const getStaticProps: GetStaticProps = async ({ params }) => {

  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});
  //console.log(JSON.stringify(response, null, 2));

  const post = {
    first_publication_date: response.first_publication_date,
    uid: response.uid,
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
          body: content.body.map (body => {
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
              }
          })
        }
      })
    }
  }

  return {
    props: {
      post
    },
    redirect: 60 * 30, //30 minutes
  }
};
