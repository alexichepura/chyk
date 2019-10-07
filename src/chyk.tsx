import { createBrowserHistory, History, Location } from "history"
import React, { FC, useState } from "react"
import { hydrate, render } from "react-dom"
import { Route, Router, StaticRouter, StaticRouterContext, useLocation } from "react-router"
import { ChykContext, useChyk } from "./hooks"
import { ensure_component_ready, loadBranchDataObject, TRouteConfig } from "./match"
import { DataRoutes } from "./routes"

export type TChykState = {
  data?: any
  statusCode?: number
}

export type TChykLocationCtx = {
  data?: any
  abortController?: AbortController
}
export type TChykLocationsCtx = Record<string, TChykLocationCtx>

type TChykProps = {
  routes: TRouteConfig[]
  browser?: boolean
  ctx?: TChykState
  defaultProps?: any
}

export class Chyk {
  routes: TRouteConfig[]
  defaultProps: any
  staticRouterContext: StaticRouterContext = {}
  history: History | null
  location: Location | null
  get locationKey(): string {
    return this.location && this.location.key ? this.location.key : "ssr"
  }

  private _statusCode: number = 200
  setStatusCode(code: number) {
    this._statusCode = code
  }
  get statusCode() {
    return this._statusCode
  }

  private locationsCtx: TChykLocationsCtx = {}
  loading: boolean = false

  constructor(props: TChykProps) {
    this.routes = props.routes

    this.history = props.browser ? createBrowserHistory() : null
    this.location = this.history ? this.history.location : null
    this.defaultProps = props.defaultProps

    if (props.ctx) {
      if (props.ctx.statusCode) {
        this.setStatusCode(props.ctx.statusCode)
      }
      if (props.ctx.data) {
        this.setLocationCtxData(this.locationKey, props.ctx.data)
      }
    }
  }

  setLocationCtx(locationKey: string, ctx: TChykLocationCtx) {
    this.locationsCtx = {
      [locationKey]: ctx,
    }
  }
  setLocationCtxData(locationKey: string, data: any) {
    this.setLocationCtx(locationKey, { data })
  }

  getLocationCtx(locationKey: string | undefined = "ssr"): TChykLocationCtx {
    return this.locationsCtx[locationKey]
  }
  getLocationCtxData(locationKey: string | undefined = "ssr") {
    return this.getLocationCtx(locationKey).data
  }

  get ctx() {
    return {
      statusCode: this.statusCode,
      data: this.getLocationCtxData(),
    }
  }

  loadData = async (pathname: string, locationKey: string = "ssr") => {
    this.loading = true
    const abortController = this.history ? new AbortController() : undefined
    const [data] = await Promise.all([
      loadBranchDataObject(this, pathname, this.routes, this.defaultProps, abortController),
      ensure_component_ready(pathname, this.routes),
    ])
    this.setLocationCtx(locationKey, { abortController, data })
    this.loading = false
  }

  render: FC = () => {
    return (
      <ChykContext.Provider value={this}>
        <Router history={this.history!}>
          <ChykPreloader>
            <DataRoutes routes={this.routes} />
          </ChykPreloader>
        </Router>
      </ChykContext.Provider>
    )
  }

  renderStatic: FC<{ pathname: string }> = ({ pathname }) => {
    return (
      <ChykContext.Provider value={this}>
        <StaticRouter location={pathname} context={this.staticRouterContext}>
          <DataRoutes routes={this.routes} />
        </StaticRouter>
      </ChykContext.Provider>
    )
  }

  tryHydrate = (el: HTMLElement | null) => {
    const Component = this.render
    const renderMethod = el && el.childNodes.length === 0 ? render : hydrate
    renderMethod(<Component />, el)
  }

  set404 = (): void => {
    this.setStatusCode(404)
  }
  get is404(): boolean {
    return this.statusCode === 404
  }
}

const ChykPreloader: FC = ({ children }) => {
  const chyk = useChyk()
  const location = useLocation()
  const [state_location, setLocation] = useState(location)
  // useEffect(() => {
  //   if (chyk.getLocationData(location.key)) {
  //     return
  //   }
  //   chyk.setStatusCode(200)
  //   chyk.loadData(location.pathname, location.key).then(() => {
  //     chyk.location = location
  //     setLocation(location)
  //   })
  // }, [location.key])

  if (location.key !== state_location.key && !chyk.getLocationCtx(location.key)) {
    chyk.setStatusCode(200)
    chyk.loadData(location.pathname, location.key).then(() => {
      chyk.location = location
      setLocation(location)
    })
  }

  return <Route location={state_location} render={() => children} />
}
