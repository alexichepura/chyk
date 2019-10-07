import { createBrowserHistory, History, Location } from "history"
import React, { FC, useRef, useState } from "react"
import { hydrate, render, Renderer } from "react-dom"
import { Route, Router, StaticRouter, StaticRouterContext, useLocation } from "react-router"
import { ChykContext, useChyk } from "./hooks"
import { ensure_component_ready, loadBranchDataObject, TLocationData, TRouteConfig } from "./match"
import { DataRoutes } from "./routes"

type TStatusCode = number
const SSR_LOCATION_KEY = "ssr"

export type TChykState = {
  data?: TLocationData
  statusCode: TStatusCode
}

export type TChykLocationCtx = {
  data?: TLocationData
  statusCode: TStatusCode
  abortController?: AbortController
}
export type TChykLocationsCtx = Record<string, TChykLocationCtx>

type TChykProps = {
  routes: TRouteConfig[]
  el?: HTMLElement | null
  ctx?: TChykState
  defaultProps?: any
}

export class Chyk {
  private _el: HTMLElement | undefined | null = null
  get el(): HTMLElement {
    if (!this._el) {
      throw "No element"
    }
    return this._el
  }

  history: History | null
  staticRouterContext: StaticRouterContext = {}
  routes: TRouteConfig[]
  defaultProps: any
  get isBrowser(): boolean {
    return Boolean(this.history)
  }
  location: Location | null
  loadingLocation: Location | null = null
  loading: boolean = false
  get locationKey(): string {
    return this.location && this.location.key ? this.location.key : SSR_LOCATION_KEY
  }

  private locationsCtx: TChykLocationsCtx = {}

  constructor(props: TChykProps) {
    this.routes = props.routes
    this._el = props.el
    this.history = props.el ? createBrowserHistory() : null
    this.location = this.history ? this.history.location : null
    this.defaultProps = props.defaultProps

    if (props.ctx) {
      this.mergeLocationCtx(this.locationKey, props.ctx)
    }
  }
  private mergeLocationCtx(locationKey: string, ctx: Partial<TChykLocationCtx>) {
    const existing_ctx = this.getLocationCtx(locationKey)
    this.locationsCtx[locationKey] = { ...existing_ctx, ...ctx }
  }

  getLocationCtx(locationKey: string | undefined = SSR_LOCATION_KEY): TChykLocationCtx {
    return this.locationsCtx[locationKey]
  }
  getCurrentLocationCtx(): TChykLocationCtx {
    return this.locationsCtx[this.locationKey]
  }
  cleanLocationCtx(locationKey: string | undefined = SSR_LOCATION_KEY) {
    delete this.locationsCtx[locationKey]
  }

  get ctx() {
    const ctx = this.getCurrentLocationCtx()
    return {
      statusCode: ctx.statusCode,
      data: ctx.data,
    }
  }

  loadData = async (
    pathname: string,
    locationKey: string = SSR_LOCATION_KEY
  ): Promise<AbortController | undefined> => {
    this.loading = true
    const abortController = this.isBrowser
      ? new AbortController()
      : ({ signal: { aborted: false } } as AbortController) // mock on server

    this.mergeLocationCtx(locationKey, { abortController, statusCode: 200 })
    try {
      const [data] = await Promise.all([
        loadBranchDataObject(this, pathname, abortController),
        ensure_component_ready(pathname, this.routes),
      ])
      this.mergeLocationCtx(locationKey, { data })
      this.loading = false
      this.loadingLocation = null
    } catch (err) {
      this.loading = false
      this.loadingLocation = null
      if (err.name === "AbortError") {
        // request was aborted
        console.log("AbortError", err)
      } else {
        throw err
      }
    }
    return abortController
  }

  set404 = (): void => {
    if (this.isBrowser) {
      if (!this.loadingLocation || !this.loadingLocation.key) {
        throw "Can't set status code while not loading"
      }
      this.mergeLocationCtx(this.loadingLocation.key, { statusCode: 404 })
    } else {
      this.mergeLocationCtx(this.locationKey, { statusCode: 404 })
    }
  }
  get is404(): boolean {
    return this.getCurrentLocationCtx().statusCode === 404
  }
  get statusCode(): TStatusCode {
    return this.getCurrentLocationCtx().statusCode
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

  get renderer(): Renderer {
    if (!this.el) {
      throw "No renderer for no element"
    }
    return this.el.childNodes.length === 0 ? render : hydrate
  }
}

const ChykPreloader: FC = ({ children }) => {
  const chyk = useChyk()
  const location = useLocation()
  const prev_location_ref = useRef<Location>(location)
  const [state_location, setLocation] = useState(location)
  // console.log(
  //   "ChykPreloader",
  //   location.pathname,
  //   chyk.loading,
  //   location.key,
  //   state_location.key,
  //   prev_location_ref.current.key
  // )

  if (location.key !== state_location.key) {
    if (prev_location_ref.current.key !== location.key) {
      const prev_location_ctx = chyk.getLocationCtx(prev_location_ref.current.key)
      prev_location_ctx.abortController && prev_location_ctx.abortController.abort()
    }
    prev_location_ref.current = location
  }

  if (location.key !== state_location.key && !chyk.getLocationCtx(location.key)) {
    chyk.loadingLocation = location
    chyk.loadData(location.pathname, location.key).then(loadDataAbortController => {
      if (loadDataAbortController && loadDataAbortController.signal.aborted) {
        // going here means loading data is finished, but we don't care anymore
        return
      }
      chyk.location = location
      chyk.cleanLocationCtx(state_location.key)
      setLocation(location)
    })
  }

  return <Route location={state_location} render={() => children} />
}
