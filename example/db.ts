export type TArticle = {
  slug: string
  title: string
}
const articles: TArticle[] = [
  { slug: "article1", title: "Article 1" },
  { slug: "article2", title: "Article 2" },
]

class DbClient {
  getYear = async () => {
    await delay()
    return 2020
  }
  getArticle = async (slug: string) => {
    await delay()
    return articles.find(article => article.slug === slug)
  }
  getArticles = async () => {
    await delay()
    return articles
  }
}
export const apiClient = new DbClient()

export const delay = (ms: number = 10): Promise<void> => new Promise(() => setTimeout(() => {}, ms))
