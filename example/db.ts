export type TArticle = {
  slug: string
  title: string
}
const articles: TArticle[] = [
  { slug: "article1", title: "Article 1" },
  { slug: "article2", title: "Article 2" },
]

export class DbClient {
  getYear = async () => {
    console.log("getYear")
    await delay()
    return 2020
  }
  getArticle = async (slug: string) => {
    console.log("getArticle")
    await delay()
    return articles.find(article => article.slug === slug)
  }
  getArticles = async () => {
    console.log("getArticles")
    await delay()
    return articles
  }
}
export const apiClient = new DbClient()

export const delay = (ms: number = 10): Promise<void> =>
  new Promise(resolve =>
    setTimeout(() => {
      resolve()
    }, ms)
  )
