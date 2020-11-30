import { createBrowserHistory } from "history"
import React from "react"
import { render } from "react-dom"
import { Router } from "react-router"
import { DataRoutes } from "../src"
import { Chyk } from "../src/chyk"
import { ChykContext, Preloader } from "../src/render"
import { createBranchItemMapper, getBranch, routes, TAppBranchItem } from "./app"
import { DbClient } from "./db"

const init = async () => {
  const history = createBrowserHistory()
  const deps = { apiSdk: new DbClient() }
  const chyk: Chyk = new Chyk({
    getBranch: getBranch,
    branchItemsMapper: (branchItem, abortController) =>
      createBranchItemMapper(chyk, deps)(branchItem as TAppBranchItem, abortController),
    data: window.ssr_data,
    statusCode: window.ssr_statusCode,
    onLoadError: (err) => {
      console.log("onLoadError", err)
    },
  })
  const { pathname } = history.location
  await chyk.loadData(getBranch(routes, pathname), pathname)
  const el = document.getElementById("app")
  render(
    <ChykContext.Provider value={chyk}>
      <Router history={history}>
        <Preloader>
          <DataRoutes routes={routes} chyk={chyk} />
        </Preloader>
      </Router>
    </ChykContext.Provider>,
    el
  )
}
init()

declare global {
  interface Window {
    ssr_data: any
    ssr_statusCode: number
  }
}
