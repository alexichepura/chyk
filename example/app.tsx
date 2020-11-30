import React, { FC } from "react"
import { matchRoutes } from "react-router-config"
import { Link, match } from "react-router-dom"
import { Chyk, useChyk } from "../src"
import { TBranchItem } from "../src/chyk"
import { TRouteConfig } from "../src/match"
import { DataRoutes, useRoute } from "../src/routes"
import { DbClient, TArticle } from "./db"

export type TAppBranchItem = TBranchItem & { match: match }

export const getBranch = (routes: TRouteConfig[], pathname: string): TAppBranchItem[] =>
  matchRoutes(routes, pathname).map((m) => ({
    route: m.route,
    matchUrl: m.match.url,
    match: m.match,
  }))

export const createBranchItemMapper = (chyk: Chyk, deps: TDeps) => (
  branchItem: TAppBranchItem,
  abortController: AbortController
): [TLoadDataProps<{}>, TDeps] => [{ chyk, abortController, match: branchItem.match }, deps]

type TLoadDataProps<M> = {
  chyk: Chyk
  match: match<M>
  abortController: AbortController
}
export type TLocationData = Record<string, any>
export type TLoadDataResult<D = TLocationData> = D
export type TChykLoadData<D, M, Deps> = (
  options: TLoadDataProps<M>,
  deps: Deps
) => Promise<TLoadDataResult<D>>

export type TDeps = { apiSdk: DbClient }
type TLoadData<T, M = any> = TChykLoadData<T, M, TDeps>

const link_style: React.CSSProperties = { marginLeft: "1rem" }

// LAYOUT
export type TLayoutData = {
  year: number
  articles: TArticle[]
}
export const Layout: FC = () => {
  const {
    data: { articles, year },
    route,
  } = useRoute<TLayoutData>()
  const chyk = useChyk()
  return (
    <div>
      <header>
        <div>
          <Link to="">home</Link>
          {articles.map((a) => (
            <Link key={a.slug} to={"/" + a.slug} style={link_style}>
              {a.title}
            </Link>
          ))}
          {articles.map((a) => (
            <Link key={"sub" + a.slug} to={"/subarticle/" + a.slug} style={link_style}>
              sub: {a.title}
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
        <div>
          <a href="#hash1">hash1 link</a>
          <br />
          <a href="#hash2">hash2 link</a>
        </div>
      </header>
      <main style={{ marginBottom: "1000px" }}>
        {chyk.is404 ? (
          <NotFound />
        ) : (
          route.routes && <DataRoutes routes={route.routes} chyk={chyk} />
        )}
      </main>
      <div id="hash1" style={{ marginBottom: "1000px" }}>
        hash1
      </div>
      <div id="hash2">hash2</div>
      <footer>&copy; {year}</footer>
    </div>
  )
}
const layoutLoader: TLoadData<TLayoutData> = async (p, d) => {
  const [year, articles] = await Promise.all([
    d.apiSdk.getYear(p.abortController.signal),
    d.apiSdk.getArticles(p.abortController.signal),
  ])
  return { year, articles }
}

// HOME
export type THomeData = {
  articles: TArticle[]
}
export const Home: FC = () => {
  const r = useRoute<THomeData>()
  console.log("r", r)
  const {
    data: { articles },
  } = useRoute<THomeData>()
  return (
    <div>
      <h1>Page Home</h1>
      <div>
        <h2>Articles</h2>
        <div>
          {articles.map((a) => (
            <div key={a.slug}>{a.title}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

const homeLoader: TLoadData<THomeData> = async ({ abortController }, { apiSdk }) => {
  console.log("homeLoader")
  const articles = await apiSdk.getArticles(abortController.signal)
  return { articles }
}

// ARTICLE
export type TArticleData = {
  article: TArticle
}
export const Article: FC = () => {
  const {
    data: { article },
  } = useRoute<TArticleData>()
  return (
    <div>
      <h1>Page {article.title}</h1>
      <article>{article.content}</article>
    </div>
  )
}

const articleLoader: TLoadData<TArticleData | null> = async (
  { abortController, chyk, match },
  { apiSdk }
) => {
  console.log("articleLoader", match.params.slug)
  const article = await apiSdk.getArticle(match.params.slug, abortController.signal)
  if (!article) {
    chyk.set404()
    return null
  }
  return { article }
}

// LongLoading
export type TLongLoadingData = {
  longLoadingData: string
}
export const LongLoading: FC = () => {
  const {
    data: { longLoadingData },
  } = useRoute<TLongLoadingData>()
  return (
    <div>
      <h1>Long Loading (abort controller)</h1>
      <article>{longLoadingData}</article>
    </div>
  )
}

const longLoadingLoader: TLoadData<Partial<TLongLoadingData>> = async (
  { abortController },
  { apiSdk }
) => {
  console.log("longLoadingLoader")
  const longLoadingData = await apiSdk.getLongLoading(abortController.signal)
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
        path: "/subarticle/:slug",
        component: Article as FC,
        exact: true,
        dataKey: "subarticle",
        loadData: articleLoader,
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
        path: "/*",
        dataKey: "404",
        loadData: async ({ chyk }) => chyk.set404(),
      },
    ],
  },
]
