import { createBrowserHistory, History, Location } from "history"
import React, { FC, useEffect, useState } from "react"
import { hydrate, render } from "react-dom"
import { Route, Router, StaticRouter, StaticRouterContext, useLocation } from "react-router"
import { ChykContext, useChyk } from "./hooks"
import {
  ensure_component_ready,
  loadBranchDataObject,
  TLoadDataResult,
  TRouteConfig,
} from "./match"
import { DataRoutes } from "./routes"

export type TChykState = {
  data?: any
  statusCode?: number
}

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

  private data: any
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
        this.setLocationData(this.locationKey, props.ctx.data)
      }
    }
  }

  setLocationData(locationKey: string, data: any) {
    this.data = {
      [locationKey]: data,
    }
  }

  getLocationData(locationKey: string | undefined = "ssr") {
    return this.data[locationKey]
  }

  getLocationRouteData<D>(
    locationKey: string | undefined = "ssr",
    dataKey: string
  ): TLoadDataResult<D> {
    return this.getLocationData(locationKey)[dataKey]
  }

  get ctx() {
    return {
      statusCode: this.statusCode,
      data: this.getLocationData(),
    }
  }

  loadData = async (pathname: string, locationKey: string = "ssr") => {
    this.loading = true
    const [data] = await Promise.all([
      loadBranchDataObject(this, pathname, this.routes, this.defaultProps),
      ensure_component_ready(pathname, this.routes),
    ])
    this.setLocationData(locationKey, data)
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
  // console.log(
  //   "ChykPreloader render",
  //   state_location.key,
  //   state_location.pathname,
  //   location.key,
  //   location.pathname
  // )
  useEffect(() => {
    // console.log(
    //   "ChykPreloader useEffect",
    //   state_location.key,
    //   state_location.pathname,
    //   location.key,
    //   location.pathname
    // )
    if (chyk.getLocationData(location.key)) {
      // console.log("ChykPreloader getLocationData return")
      return
    }
    chyk.setStatusCode(200)
    chyk.loadData(location.pathname, location.key).then(() => {
      // console.log(
      //   "ChykPreloader then",
      //   state_location.key,
      //   state_location.pathname,
      //   location.key,
      //   location.pathname
      // )
      chyk.location = location
      setLocation(location)
    })
  }, [location.key])

  return <Route location={state_location} render={() => children} />
}
