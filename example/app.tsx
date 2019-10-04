import React, { FC } from "react"
import { RouteComponentProps } from "react-router"
import { renderRoutes } from "react-router-config"
import { Link } from "react-router-dom"
import { useChyk } from "../src"
import { TLoadData, TRouteConfig } from "../src/match"
import { useRouteData } from "../src/useRouteData"
import { DbClient, TArticle } from "./db"

export type TChykDefaultProps = { apiClient: DbClient }
type TAppLoadData<T, M = any> = TLoadData<T, M, TChykDefaultProps>

const link_style: React.CSSProperties = { marginLeft: "1rem" }

// LAYOUT
type TLayoutProps = {} & RouteComponentProps<{}> & { route: TRouteConfig }
export type TLayoutData = {
  year: number
  articles: TArticle[]
}
export const Layout: FC<TLayoutProps> = props => {
  const { data } = useRouteData<TLayoutData>(props)
  const chyk = useChyk()
  if (!data) return null
  return (
    <div>
      <header>
        <Link to={"/"}>home</Link>
        {data.articles.map(a => (
          <Link key={a.slug} to={"/" + a.slug} style={link_style}>
            {a.title}
          </Link>
        ))}
        <Link to={"/article-404"} style={link_style}>
          404
        </Link>
      </header>
      <main>
        {chyk.statusCode === 404 ? <NotFound /> : renderRoutes(props.route && props.route.routes)}
      </main>
      <footer>&copy; {data.year}</footer>
    </div>
  )
}
const layoutLoader: TAppLoadData<TLayoutData> = async ({ props: { apiClient } }) => {
  console.log("layoutLoader")
  const [year, articles] = await Promise.all([apiClient.getYear(), apiClient.getArticles()])
  return { year, articles }
}

// HOME
type THomeProps = {} & RouteComponentProps<{}> & { route: TRouteConfig }
export type THomeData = {
  articles: TArticle[]
}
export const Home: FC<THomeProps> = props => {
  const { data } = useRouteData<THomeData>(props)
  if (!data) return null

  return (
    <div>
      <h1>Page Home</h1>
      <div>
        <h2>Articles</h2>
        <div>
          {data.articles.map(a => (
            <div key={a.slug}>{a.title}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
const homeLoader: TAppLoadData<THomeData> = async ({ props: { apiClient } }) => {
  console.log("homeLoader")
  const articles = await apiClient.getArticles()
  return { articles }
}

// ARTICLE
type TArticleMatchParams = { slug: string }
type TArticleProps = {} & RouteComponentProps<TArticleMatchParams> & { route: TRouteConfig }
export type TArticleData = {
  article?: TArticle
}
export const Article: FC<TArticleProps> = props => {
  const { data } = useRouteData<TArticleData>({
    route: props.route,
    match: props.match,
    deps: [props.match.params.slug],
  })
  if (!data || !data.article) return null
  return (
    <div>
      <h1>Page {data.article.title}</h1>
      <article>{data.article.content}</article>
    </div>
  )
}
const articleLoader: TAppLoadData<TArticleData, TArticleMatchParams> = async ({
  match,
  chyk,
  props: { apiClient },
}) => {
  console.log("articleLoader")
  const article = await apiClient.getArticle(match.params.slug)
  if (!article) {
    chyk.statusCode = 404
  }
  return { article }
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
      // {
      //   path: "/404",
      //   component: NotFound as FC,
      //   loadData: async ({ chyk }) => (chyk.statusCode = 404),
      // },
      {
        path: "/:slug",
        component: Article as FC,
        dataKey: "article",
        loadData: articleLoader,
      },
      {
        component: NotFound as FC,
        loadData: async ({ chyk }) => (chyk.statusCode = 404),
      },
    ],
  },
]
