import React, { FC } from "react"
import { RouteComponentProps } from "react-router"
import { renderRoutes } from "react-router-config"
import { Link } from "react-router-dom"
import { TLoadData, TRouteConfig } from "../src/match"
import { useRouteData } from "../src/useRouteData"
import { DbClient, TArticle } from "./db"

export type TChykDefaultProps = { apiClient: DbClient }
type TAppLoadData<T, M = any> = TLoadData<T, M, TChykDefaultProps>

// LAYOUT
type TLayoutProps = {} & RouteComponentProps<{}> & { route: TRouteConfig }
export type TLayoutData = {
  year: number
  articles: TArticle[]
}
export const Layout: FC<TLayoutProps> = props => {
  const { data } = useRouteData<TLayoutData>(props)
  // useLocation()
  if (!data) return null
  return (
    <div>
      <header>
        <h2>Header. Year: {data.year}</h2>
        <Link to={"/"}>home</Link>
      </header>
      <main>{renderRoutes(props.route && props.route.routes)}</main>
      <footer>
        <h2>Footer</h2>
        <h3>Articles</h3>
        {data.articles.map(a => (
          <div key={a.slug}>
            <Link to={"/" + a.slug}>{a.title}</Link>
          </div>
        ))}
      </footer>
    </div>
  )
}
const layoutLoader: TAppLoadData<TLayoutData> = async ({ props: { apiClient } }) => {
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
    </div>
  )
}
const articleLoader: TAppLoadData<TArticleData, TArticleMatchParams> = async ({
  match,
  chyk,
  props: { apiClient },
}) => {
  const article = await apiClient.getArticle(match.params.slug)
  if (!article) {
    chyk.statusCode = 404
  }
  return { article }
}

// NOT FOUND
export const NotFound: FC = () => <div>404 not found</div>

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
        path: "/404",
        component: NotFound as FC,
        loadData: async ({ chyk }) => (chyk.statusCode = 404),
      },
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
