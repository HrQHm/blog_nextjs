import { GetStaticProps } from 'next';

import { getPrismicClient } from '../services/prismic';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { useState } from 'react';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [nextPage, setNextPage] = useState(postsPagination.next_page);
  const [posts, setPosts] = useState(postsPagination.results);

  async function loadMorePosts() {
    await fetch(nextPage)
      .then(response => response.json())
      .then(response => {
        setNextPage(response.next_page);
        const newPosts = response.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          }
        });
        setPosts(newPosts);
      })
  }
  return (
    <>
      <Head>
        <title>spaceTravelling</title>
      </Head>
      <div className={commonStyles.container}>
        <main className={styles.content}>
          <div className={styles.posts}>
            {posts.map(post => (
              <Link href={`/post/${post.uid}`} key={post.uid}>
                <a>
                  <strong>{post.data.title}</strong>
                  <h2>{post.data.subtitle}</h2>
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
                  </div>
                </a>
              </Link>
            ))}

            {nextPage && (
              <h1 onClick={loadMorePosts}>
                Carregar mais posts
              </h1>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: ['publication.title', 'publication.content'],
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination
    }
  }
};
