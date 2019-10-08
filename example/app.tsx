import React, { FC } from "react"
import { Link } from "react-router-dom"
import { useChyk } from "../src"
import { TDataComponentProps, TLoadData, TRouteConfig } from "../src/match"
import { DataRoutes } from "../src/routes"
import { DbClient, TArticle } from "./db"

export type TChykDefaultProps = { apiClient: DbClient }
type TAppLoadData<T, M = any> = TLoadData<T, M, TChykDefaultProps>

const link_style: React.CSSProperties = { marginLeft: "1rem" }

// LAYOUT
export type TLayoutData = {
  year: number
  articles: TArticle[]
}
type TLayoutProps = TDataComponentProps<TLayoutData>
export const Layout: FC<TLayoutProps> = ({ route, year, articles }) => {
  const chyk = useChyk()
  return (
    <div>
      <header>
        <div>
          <Link to="">home</Link>
          {articles.map(a => (
            <Link key={a.slug} to={"/" + a.slug} style={link_style}>
              {a.title}
            </Link>
          ))}
          <Link to="/article-404" style={link_style}>
            Article 404
          </Link>
          <Link to="/route/404" style={link_style}>
            Route 404
          </Link>
          <span style={link_style}>{chyk.loading ? "Loading" : "Loaded"}</span>
        </div>
        <div>
          <Link to="/long-loading">Long Loading (abort controller)</Link>
          {/* {abortController ? (
            <button onClick={() => abortController.abort()}>Abort loading</button>
          ) : null} */}
        </div>
      </header>
      <main>
        {chyk.is404 ? <NotFound /> : route.routes && <DataRoutes routes={route.routes} />}
      </main>
      <footer>&copy; {year}</footer>
    </div>
  )
}
const layoutLoader: TAppLoadData<TLayoutData> = async ({
  abortController,
  props: { apiClient },
}) => {
  console.log("layoutLoader")
  const [year, articles] = await Promise.all([
    apiClient.getYear(abortController.signal),
    apiClient.getArticles(abortController.signal),
  ])
  return { year, articles }
}

// HOME
export type THomeData = {
  articles: TArticle[]
}
type THomeProps = TDataComponentProps<THomeData>
export const Home: FC<THomeProps> = ({ articles }) => (
  <div>
    <h1>Page Home</h1>
    <div>
      <h2>Articles</h2>
      <div>
        {articles.map(a => (
          <div key={a.slug}>{a.title}</div>
        ))}
      </div>
    </div>
  </div>
)
const homeLoader: TAppLoadData<THomeData> = async ({ abortController, props: { apiClient } }) => {
  console.log("homeLoader")
  const articles = await apiClient.getArticles(abortController.signal)
  return { articles }
}

// ARTICLE
type TArticleMatchParams = { slug: string }
type TArticleProps = TDataComponentProps<TArticleData, TArticleMatchParams>
export type TArticleData = {
  article: TArticle
}
export const Article: FC<TArticleProps> = props => {
  return (
    <div>
      <h1>Page {props.article.title}</h1>
      <article>{props.article.content}</article>
    </div>
  )
}

const articleLoader: TAppLoadData<Partial<TArticleData>, TArticleMatchParams> = async ({
  abortController,
  match,
  chyk,
  props: { apiClient },
}) => {
  console.log("articleLoader")
  const article = await apiClient.getArticle(match.params.slug, abortController.signal)
  if (!article) {
    chyk.set404()
  }
  return { article }
}

// LongLoading
type TLongLoadingProps = TDataComponentProps<TLongLoadingData>
export type TLongLoadingData = {
  longLoadingData: string
}
export const LongLoading: FC<TLongLoadingProps> = ({ longLoadingData }) => (
  <div>
    <h1>Long Loading (abort controller)</h1>
    <article>{longLoadingData}</article>
  </div>
)
const longLoadingLoader: TAppLoadData<Partial<TLongLoadingData>> = async ({
  abortController,
  props: { apiClient },
}) => {
  console.log("longLoadingLoader")
  const longLoadingData = await apiClient.getLongLoading(abortController.signal)
  return { longLoadingData }
}

// NOT FOUND
export const NotFound: FC = () => (
  <div>
    <h1>404 not found</h1>
  </div>
)

export const routes: TRouteConfig[] = [
  {
    component: Layout as FC,
    dataKey: "layout",
    loadData: layoutLoader,
    routes: [
      {
        path: "/",
        exact: true,
        component: Home as FC,
        dataKey: "home",
        loadData: homeLoader,
      },
      {
        path: "/long-loading",
        exact: true,
        component: LongLoading as FC,
        dataKey: "longLoading",
        loadData: longLoadingLoader,
      },
      {
        path: "/:slug",
        component: Article as FC,
        exact: true,
        dataKey: "article",
        loadData: articleLoader,
      },
      {
        component: NotFound as FC,
        loadData: async ({ chyk }) => chyk.set404(),
      },
    ],
  },
]
