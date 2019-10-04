import { createBrowserHistory, History } from "history"
import React, { FC, useEffect } from "react"
import { hydrate, render } from "react-dom"
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
  defaultProps?: any
}

export class Chyk {
  statusCode: number = 200
  url: URL
  routes: TRouteConfig[]
  data: any
  defaultProps: any
  staticRouterContext: StaticRouterContext = {}
  history: History | null

  constructor(props: TChykProps) {
    this.url = props.url
    this.routes = props.routes
    this.data = props.data
    this.history = props.browser ? createBrowserHistory() : null
    this.defaultProps = props.defaultProps
  }

  loadData = async (props?: any) => {
    const [data] = await Promise.all([
      loadBranchDataObject(this, this.url.pathname, this.routes, {
        ...this.defaultProps,
        ...props,
      }),
      ensure_component_ready(this.url.pathname, this.routes),
    ])
    this.data = data
  }

  tryLoadData = async (props?: any) => {
    if (!this.data) {
      await this.loadData(props)
    }
  }

  render: FC = () => {
    useEffect(() => {
      this.data = null
    }, [])
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

  tryHydrate = (el: HTMLElement | null) => {
    const Component = this.render
    const renderMethod = el && el.childNodes.length === 0 ? render : hydrate
    renderMethod(<Component />, el)
  }

  getData<D>(dataKey: string): TLoadDataResult<D> {
    return this.data[dataKey]
  }
}
