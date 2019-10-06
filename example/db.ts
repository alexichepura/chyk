export type TArticle = {
  slug: string
  title: string
  content: string
}

const content1 = `Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium,
totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. `

const content2 = `Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?
Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur,
vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?`

const articles: TArticle[] = [
  { slug: "article1", title: "Article 1", content: content1 },
  { slug: "article2", title: "Article 2", content: content2 },
]

export class DbClient {
  getYear = async () => {
    // console.log("getYear")
    await delay(200)
    return 2020
  }
  getArticle = async (slug: string) => {
    // console.log("getArticle")
    await delay(300)
    return articles.find(article => article.slug === slug)
  }
  getArticles = async () => {
    // console.log("getArticles")
    await delay(400)
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
