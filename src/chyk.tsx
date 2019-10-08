import { createBrowserHistory, createLocation, History, Location } from "history"
import React, { FC, useState } from "react"
import { hydrate, render, Renderer } from "react-dom"
import { Route, Router, StaticRouter, StaticRouterContext, useLocation } from "react-router"
import { MatchedRoute, matchRoutes } from "react-router-config"
import { ChykContext, useChyk } from "./hooks"
import { loadBranchComponents, loadBranchDataObject, TLocationData, TRouteConfig } from "./match"
import { DataRoutes } from "./routes"

type TStatusCode = number
const SSR_LOCATION_KEY = "ssr"

export type TChykState = {
  data?: TLocationData
  statusCode: TStatusCode
}

export type TChykLocationCtx = {
  pathname: string
  matches: MatchedRoute<{}>[]
  abortController: AbortController
  location: Location
  loading: boolean
  statusCode: TStatusCode
  data?: TLocationData
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
  get loading(): boolean {
    return Object.values(this.locationCtxs).some(ctx => ctx.loading)
  }

  locationCtxs: TChykLocationsCtx = {}

  currentLocationKey: string = SSR_LOCATION_KEY

  constructor(props: TChykProps) {
    this.routes = props.routes
    this.defaultProps = props.defaultProps
    this._el = props.el
    this.history = props.el ? createBrowserHistory() : null
    if (this.history) {
      if (this.history.location.key) {
        this.currentLocationKey = this.history.location.key
      } else {
        this.history.location.key = SSR_LOCATION_KEY
      }
      if (props.ctx) {
        this.createLocationCtxFromState(props.ctx, this.history.location)
      }
    }
  }
  createLocationCtxFromState(state: TChykState, location: Location) {
    this.mergeLocationCtx(this.currentLocationKey, {
      ...state,
      location,
    })
  }
  upsertLocationCtxLoading(
    key: string,
    abortController: AbortController,
    pathname: string,
    matches: MatchedRoute<{}>[],
    location: Location
  ) {
    this.mergeLocationCtx(key, {
      matches,
      pathname,
      location,
      abortController,
      statusCode: 200,
      loading: true,
    })
  }
  updateLocationCtxLoaded(key: string, data: any) {
    this.mergeLocationCtx(key, {
      data,
      loading: false,
    })
  }
  private mergeLocationCtx(locationKey: string, ctx: Partial<TChykLocationCtx>) {
    const _ctx = this.locationCtxs[locationKey] || {}
    this.locationCtxs[locationKey] = Object.assign(_ctx, ctx)
  }

  getLocationCtx(locationKey: string | undefined): TChykLocationCtx {
    if (!locationKey) {
      throw "No locationKey"
    }
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

  loadData = async (_location: string | Location): Promise<boolean> => {
    const abortController = this.isBrowser
      ? new AbortController()
      : ({ signal: { aborted: false } } as AbortController) // mock on server

    const location = typeof _location === "string" ? createLocation(_location) : _location
    const { key = SSR_LOCATION_KEY, pathname } = location

    const matches = matchRoutes(this.routes, pathname)
    this.upsertLocationCtxLoading(key, abortController, pathname, matches, location)
    let data
    data = (await Promise.all([
      loadBranchDataObject(this, matches, abortController),
      loadBranchComponents(matches),
    ]))[0]

    if (!key) {
      throw "No location key"
    }
    this.currentLocationKey = key
    this.updateLocationCtxLoaded(key, data)
    return true
  }
  abortLoading() {
    Object.values(this.locationCtxs).forEach(ctx => {
      ctx.abortController && ctx.abortController.abort()
      ctx.loading = false
    })
  }

  get statusCode(): TStatusCode {
    return this.getCurrentLocationCtx().statusCode
  }
  get is404(): boolean {
    return this.statusCode === 404
  }
  setStatus(statusCode: TStatusCode) {
    Object.values(this.locationCtxs).forEach(ctx => {
      if (ctx.loading) {
        ctx.statusCode = statusCode
      }
    })
  }
  set404 = (): void => {
    this.setStatus(404)
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

  renderStatic: FC = () => {
    const ctx = this.getCurrentLocationCtx()
    return (
      <ChykContext.Provider value={this}>
        <StaticRouter location={ctx.location} context={this.staticRouterContext}>
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
  const [render_key, set_render_key] = useState(location.key)

  if (render_key !== location.key) {
    chyk.abortLoading()

    if (!chyk.getLocationCtx(location.key)) {
      chyk
        .loadData(location)
        .then(() => {
          chyk.cleanLocationCtx(render_key)
          set_render_key(location.key)
        })
        .catch(err => {
          if (err.name === "AbortError") {
            // request was aborted, so we don't care about this error
            console.log("AbortError", err)
          } else {
            throw err
          }
        })
    }
  }

  const ctx = chyk.getCurrentLocationCtx()
  return <Route location={ctx.location} render={() => children} />
}
