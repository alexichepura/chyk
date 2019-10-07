import { createBrowserHistory, History, Location } from "history"
import React, { FC, useRef, useState } from "react"
import { hydrate, render } from "react-dom"
import { Route, Router, StaticRouter, StaticRouterContext, useLocation } from "react-router"
import { ChykContext, useChyk } from "./hooks"
import { ensure_component_ready, loadBranchDataObject, TLocationData, TRouteConfig } from "./match"
import { DataRoutes } from "./routes"

export type TChykState = {
  data?: TLocationData
  statusCode?: number
}

export type TChykLocationCtx = {
  data?: TLocationData
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
  get isBrowser(): boolean {
    return Boolean(this.history)
  }
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

  // private setLocationCtx(locationKey: string, ctx: TChykLocationCtx) {
  //   this.locationsCtx = {
  //     [locationKey]: ctx,
  //   }
  // }
  private mergeLocationCtx(locationKey: string, ctx: TChykLocationCtx) {
    const existing_ctx = this.getLocationCtx(locationKey)
    this.locationsCtx[locationKey] = { ...existing_ctx, ...ctx }
  }
  private setLocationCtxData(locationKey: string, data: TLocationData) {
    this.mergeLocationCtx(locationKey, { data })
  }

  getLocationCtx(locationKey: string | undefined = "ssr"): TChykLocationCtx {
    return this.locationsCtx[locationKey]
  }
  private getLocationCtxData(locationKey: string | undefined = "ssr"): TLocationData {
    return this.getLocationCtx(locationKey).data
  }

  get ctx() {
    return {
      statusCode: this.statusCode,
      data: this.getLocationCtxData(),
    }
  }

  loadData = async (
    pathname: string,
    locationKey: string = "ssr"
  ): Promise<AbortController | undefined> => {
    this.loading = true
    const abortController = this.isBrowser ? new AbortController() : ({} as AbortController) // mock on server
    this.mergeLocationCtx(locationKey, { abortController })
    try {
      const [data] = await Promise.all([
        loadBranchDataObject(this, pathname, this.routes, this.defaultProps, abortController),
        ensure_component_ready(pathname, this.routes),
      ])
      this.setLocationCtxData(locationKey, data)
      this.loading = false
    } catch (err) {
      if (err.name === "AbortError") {
        // request was aborted
        console.log("AbortError", err)
      }
    }
    return abortController
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
  const prev_location_ref = useRef<Location>(location)
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
  // console.log("ChykPreloader", location.key, state_location.key)
  if (location.key !== state_location.key) {
    if (prev_location_ref.current.key !== location.key) {
      const prev_location_ctx = chyk.getLocationCtx(prev_location_ref.current.key)
      prev_location_ctx.abortController && prev_location_ctx.abortController.abort()
    }
    prev_location_ref.current = location
  }
  if (location.key !== state_location.key && !chyk.getLocationCtx(location.key)) {
    chyk.setStatusCode(200)
    chyk.loadData(location.pathname, location.key).then(loadDataAbortController => {
      if (loadDataAbortController && loadDataAbortController.signal.aborted) {
        // going here means loading data is finished, but we don't care anymore
        return
      }
      chyk.location = location
      setLocation(location)
    })
  }

  return <Route location={state_location} render={() => children} />
}
