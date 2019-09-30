import { createBrowserHistory, History } from "history"
import React, { FC } from "react"
import { Router, StaticRouter, StaticRouterContext } from "react-router"
import { renderRoutes } from "react-router-config"
import { ChykContext } from "./hooks"
import {
  ensure_component_ready,
  loadBranchDataObject,
  TLoadDataResult,
  TRouteConfig,
} from "./match"

type TChykProps = {
  url: URL
  routes: TRouteConfig[]
  browser?: boolean
  data?: any
}

export class Chyk {
  statusCode: number = 200
  url: URL
  routes: TRouteConfig[]
  data: any
  staticRouterContext: StaticRouterContext = {}
  history: History | null

  constructor(props: TChykProps) {
    this.url = props.url
    this.routes = props.routes
    this.data = props.data
    this.history = props.browser ? createBrowserHistory() : null
  }

  loadData = async (props?: any) => {
    const [data] = await Promise.all([
      loadBranchDataObject(this, this.url.pathname, this.routes, props),
      ensure_component_ready(this.url.pathname, this.routes),
    ])
    this.data = data
  }

  render: FC = () => {
    return (
      <ChykContext.Provider value={this}>
        {this.history ? (
          <Router history={this.history}>{renderRoutes(this.routes)}</Router>
        ) : (
          <StaticRouter location={this.url.pathname} context={this.staticRouterContext}>
            {renderRoutes(this.routes)}
          </StaticRouter>
        )}
      </ChykContext.Provider>
    )
  }

  getData<D>(dataKey: string): TLoadDataResult<D> {
    return this.data[dataKey]
  }
}
