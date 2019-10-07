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
  loading: boolean
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
  currentLocationKey: string = SSR_LOCATION_KEY
  get loading(): boolean {
    return Object.values(this.locationCtxs).some(ctx => ctx.loading)
  }

  private locationCtxs: TChykLocationsCtx = {}

  constructor(props: TChykProps) {
    this.routes = props.routes
    this._el = props.el
    this.history = props.el ? createBrowserHistory() : null
    if (this.history && this.history.location.key) {
      this.currentLocationKey = this.history.location.key
    }
    this.defaultProps = props.defaultProps

    if (props.ctx) {
      this.mergeLocationCtx(this.currentLocationKey, props.ctx)
    }
  }
  private createLocationCtx(locationKey: string, ctx: Partial<TChykLocationCtx>) {
    this.locationCtxs[locationKey] = { statusCode: 200, loading: true, ...ctx }
  }
  private mergeLocationCtx(locationKey: string, ctx: Partial<TChykLocationCtx>) {
    this.locationCtxs[locationKey] = { ...this.locationCtxs[locationKey], ...ctx }
  }

  getLocationCtx(locationKey: string | undefined = SSR_LOCATION_KEY): TChykLocationCtx {
    return this.locationCtxs[locationKey]
  }
  getCurrentLocationCtx(): TChykLocationCtx {
    return this.locationCtxs[this.currentLocationKey]
  }
  cleanLocationCtx(locationKey: string | undefined = SSR_LOCATION_KEY) {
    delete this.locationCtxs[locationKey]
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
    const abortController = this.isBrowser
      ? new AbortController()
      : ({ signal: { aborted: false } } as AbortController) // mock on server

    this.createLocationCtx(locationKey, { abortController })
    let data
    try {
      data = (await Promise.all([
        loadBranchDataObject(this, pathname, abortController),
        ensure_component_ready(pathname, this.routes),
      ]))[0]
    } catch (err) {
      if (err.name === "AbortError") {
        // request was aborted, so we don't care about this error anymore
        console.log("AbortError", err)
      } else {
        throw err
      }
    }

    this.mergeLocationCtx(locationKey, { data, loading: false })
    return abortController
  }

  get statusCode(): TStatusCode {
    return this.getCurrentLocationCtx().statusCode
  }
  get is404(): boolean {
    return this.statusCode === 404
  }
  set404 = (): void => {
    this.mergeLocationCtx(this.currentLocationKey, { statusCode: 404 })
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
  const prev_ref = useRef<Location>(location)
  const [render, setRendering] = useState(location)

  if (location.key !== render.key) {
    if (prev_ref.current.key !== location.key) {
      const prev_ctx = chyk.getLocationCtx(prev_ref.current.key)
      prev_ctx.abortController && prev_ctx.abortController.abort()
    }
    prev_ref.current = location
  }

  if (location.key !== render.key && !chyk.getLocationCtx(location.key)) {
    chyk.loadData(location.pathname, location.key).then(loadDataAbortController => {
      if (loadDataAbortController && loadDataAbortController.signal.aborted) {
        // going here means loading data is finished, but we don't care anymore
        return
      }
      if (!location.key) {
        throw "No location key"
      }
      chyk.currentLocationKey = location.key
      chyk.cleanLocationCtx(render.key)
      setRendering(location)
    })
  }

  return <Route location={render} render={() => children} />
}
