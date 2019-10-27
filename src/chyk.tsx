import { createBrowserHistory, createLocation, History, Location } from "history"
import React, { FC, useState } from "react"
import { hydrate, render, Renderer } from "react-dom"
import { Route, Router, StaticRouter, StaticRouterContext, useLocation } from "react-router"
import { MatchedRoute, matchRoutes } from "react-router-config"
import { ChykContext, useChyk } from "./hooks"
import { loadBranchComponents, loadBranchDataObject, TLocationData, TRouteConfig } from "./match"
import { DataRoutes } from "./routes"

export type TStatusCode = number
const SSR_LOCATION_KEY = "ssr"

export type TChykLocationState = {
  pathname: string
  matches: MatchedRoute<{}>[]
  abortController: AbortController
  location: Location
  loading: boolean
  statusCode: TStatusCode
  data?: TLocationData
}
export type TChykLocationsStates = Record<string, TChykLocationState>

type TChykProps<D = any> = {
  routes: TRouteConfig[]
  el?: HTMLElement | null
  data?: TLocationData
  statusCode?: TStatusCode
  deps?: D
}

export class Chyk<D = any> {
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
  deps: D | undefined
  get isBrowser(): boolean {
    return Boolean(this.history)
  }
  get loading(): boolean {
    return Object.values(this.locationStates).some(state => state.loading)
  }

  private locationStates: TChykLocationsStates = {}
  private currentLocationKey: string = SSR_LOCATION_KEY

  constructor(props: TChykProps<D>) {
    this.routes = props.routes
    this.deps = props.deps
    this._el = props.el
    this.history = props.el ? createBrowserHistory() : null
    if (this.history) {
      if (this.history.location.key) {
        this.currentLocationKey = this.history.location.key
      } else {
        this.history.location.key = SSR_LOCATION_KEY
      }
      this.mergeLocationState(this.currentLocationKey, {
        data: props.data,
        location: this.history.location,
        ...(props.statusCode ? { statusCode: props.statusCode } : null),
      })
    }
  }

  upsertLocationStateLoading(
    key: string,
    abortController: AbortController,
    pathname: string,
    matches: MatchedRoute<{}>[],
    location: Location
  ) {
    this.mergeLocationState(key, {
      matches,
      pathname,
      location,
      abortController,
      statusCode: 200,
      loading: true,
    })
  }
  updateLocationStateLoaded(key: string, data: any) {
    this.mergeLocationState(key, {
      data,
      loading: false,
    })
  }
  private mergeLocationState(locationKey: string, state: Partial<TChykLocationState>) {
    const _state = this.locationStates[locationKey] || {}
    this.locationStates[locationKey] = Object.assign(_state, state)
  }

  getLocationState(locationKey: string | undefined): TChykLocationState {
    if (!locationKey) {
      throw "No locationKey"
    }
    return this.locationStates[locationKey]
  }
  get currentLocationState(): TChykLocationState {
    return this.locationStates[this.currentLocationKey]
  }
  get statusCode(): TStatusCode {
    return this.currentLocationState.statusCode
  }
  get data(): any {
    return this.currentLocationState.data
  }
  cleanLocationState(locationKey: string | undefined = SSR_LOCATION_KEY) {
    delete this.locationStates[locationKey]
  }

  loadData = async (_location: string | Location): Promise<boolean> => {
    const abortController = this.isBrowser
      ? new AbortController()
      : ({ signal: { aborted: false } } as AbortController) // mock on server

    const location = typeof _location === "string" ? createLocation(_location) : _location
    const { key = SSR_LOCATION_KEY, pathname } = location

    const matches = matchRoutes(this.routes, pathname)
    this.upsertLocationStateLoading(key, abortController, pathname, matches, location)
    let data
    data = (await Promise.all([
      loadBranchDataObject(this, matches, abortController),
      loadBranchComponents(matches),
    ]))[0]

    if (!key) {
      throw "No location key"
    }
    this.currentLocationKey = key
    this.updateLocationStateLoaded(key, data)
    return true
  }
  abortLoading() {
    Object.values(this.locationStates).forEach(state => {
      state.abortController && state.abortController.abort()
      state.loading = false
    })
  }

  get is404(): boolean {
    return this.statusCode === 404
  }
  setStatus(statusCode: TStatusCode) {
    Object.values(this.locationStates).forEach(state => {
      if (state.loading) {
        state.statusCode = statusCode
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
    return (
      <ChykContext.Provider value={this}>
        <StaticRouter
          location={this.currentLocationState.location}
          context={this.staticRouterContext}
        >
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

    if (!chyk.getLocationState(location.key)) {
      chyk
        .loadData(location)
        .then(() => {
          chyk.cleanLocationState(render_key)
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

  return <Route location={chyk.currentLocationState.location} render={() => children} />
}
