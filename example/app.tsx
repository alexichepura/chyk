import React, { FC } from "react"
import { RouteComponentProps } from "react-router"
import { renderRoutes } from "react-router-config"
import { TLoadData, TRouteConfig } from "../src/match"
import { useRouteData } from "../src/useRouteData"
import { apiClient, TArticle } from "./db"

// LAYOUT
type TLayoutProps = {} & RouteComponentProps<{}> & { route: TRouteConfig }
export type TLayoutData = {
  year: number
}
export const Layout: FC<TLayoutProps> = props => {
  const { data } = useRouteData<TLayoutData>(props)
  if (!data) return null
  return (
    <div>
      <header>{data.year}</header>
      <main>{renderRoutes(props.route && props.route.routes)}</main>
    </div>
  )
}
const layoutLoader: TLoadData<TLayoutData> = async () => {
  const year = await apiClient.getYear()
  return { data: { year } }
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
      <h1>Home</h1>
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
const homeLoader: TLoadData<THomeData> = async () => {
  const articles = await apiClient.getArticles()
  return { data: { articles } }
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
      <h1>{data.article.title}</h1>
    </div>
  )
}
const articleLoader: TLoadData<TArticleData, TArticleMatchParams> = async ({ match }) => {
  const article = await apiClient.getArticle(match.params.slug)
  return { data: { article }, statusCode: article ? 200 : 404 }
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
        loadData: () => Promise.resolve({ statusCode: 404 }),
      },
      {
        path: "/:slug",
        component: Article as FC,
        dataKey: "article",
        loadData: articleLoader,
      },
      {
        component: NotFound as FC,
        loadData: () => Promise.resolve({ statusCode: 404 }),
      },
    ],
  },
]
