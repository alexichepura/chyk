import { createBrowserHistory } from "history"
import React from "react"
import { render } from "react-dom"
import { Router } from "react-router"
import { DataRoutes } from "../src"
import { Chyk } from "../src/chyk"
import { ChykContext, Preloader } from "../src/render"
import { getBranches, routes, TDeps } from "./app"
import { DbClient } from "./db"

const init = async () => {
  const history = createBrowserHistory()
  const lib = new Chyk<TDeps>({
    getBranches,
    deps: { apiSdk: new DbClient() },
    data: window.ssr_data,
    statusCode: window.ssr_statusCode,
    onLoadError: (err) => {
      console.log("onLoadError", err)
    },
  })
  const { pathname } = history.location
  await lib.loadData(getBranches(routes, pathname), pathname)
  const el = document.getElementById("app")
  render(
    <ChykContext.Provider value={lib}>
      <Router history={history}>
        <Preloader>
          <DataRoutes routes={routes} chyk={lib} />
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
