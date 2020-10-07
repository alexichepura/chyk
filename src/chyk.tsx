import { Action, createBrowserHistory, createLocation, History, Location } from "history"
import { ComponentType } from "react"
import { StaticRouterContext } from "react-router"
import { MatchedRoute, matchRoutes } from "react-router-config"
import {
  getKey,
  loadBranchComponents,
  loadBranchDataObject,
  matchesRoutesKeys,
  TLocationData,
  TRouteConfig,
} from "./match"
import { chykHydrateOrRender } from "./render"

export type TStatusCode = number

export type TState = {
  pathname: string
  matches: MatchedRoute<{}>[]
  abortController?: AbortController
  location: Location
  loading: boolean
  statusCode: TStatusCode
  keys: Record<string, string>
}
export type TStates = TState[]

type TChykProps<D = any> = {
  routes: TRouteConfig[]
  el?: HTMLElement | null
  data?: TLocationData
  statusCode?: TStatusCode
  deps: D extends undefined ? never : D
  component?: ComponentType
  history?: History
  onLoadError?: (err: Error) => void
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
  onLoadError: (err: Error) => void = (err) => {
    throw err
  }
  staticRouterContext: StaticRouterContext = {}
  routes: TRouteConfig[]
  deps: D extends undefined ? never : D
  component?: ComponentType
  get loading(): boolean {
    return this.states.some((state) => state.loading)
  }
  maxStates = 2
  states: TStates = []
  private i: number = -1
  data: Record<string, any> = {}
  get state(): TState {
    return this.states[this.i]
  }
  get is404(): boolean {
    return this.state.statusCode === 404
  }

  constructor(props: TChykProps<D>) {
    this.routes = props.routes
    this.deps = props.deps
    this.component = props.component
    this._el = props.el
    this.history = props.history ? props.history : props.el ? createBrowserHistory() : null
    if (props.onLoadError) {
      this.onLoadError = props.onLoadError
    }
    if (props.data) {
      this.data = props.data
    }
    if (props.statusCode) {
      this.merge(0, { statusCode: props.statusCode })
    }
    if (this.history) {
      this.loadData(this.history.location).then(() => chykHydrateOrRender(this))
    }
  }

  private merge(i: number, state: Partial<TState>) {
    this.states[i] = { ...(this.states[i] || {}), ...state }
  }

  loadData = async (_location: string | Location, action?: Action): Promise<boolean> => {
    const i = this.i + 1
    const abortController = Boolean(this.history)
      ? new AbortController()
      : ({ signal: { aborted: false } } as AbortController) // mock on server

    const location = typeof _location === "string" ? createLocation(_location) : _location
    const { pathname } = location
    const matches = matchRoutes(this.routes, pathname)
    const keys = matchesRoutesKeys(matches)

    if (i === 0) {
      this.merge(0, { location, matches, keys })
    }
    const diffedMatches = matches.filter((m) => {
      const route = m.route as TRouteConfig
      const key = getKey(route.dataKey, m.match.url)
      return (
        !key ||
        !this.data[key] ||
        (action === "PUSH" &&
          route.dataKey &&
          this.state.keys[route.dataKey] !== keys[route.dataKey])
      )
    })
    this.merge(i, {
      keys,
      matches,
      pathname,
      location,
      abortController,
      loading: true,
    })

    try {
      const [loadedData] = await Promise.all([
        loadBranchDataObject(this, diffedMatches, abortController),
        loadBranchComponents(matches),
      ])
      Object.entries(loadedData).forEach(([key, matchData]) => {
        this.data[key] = matchData
      })
    } catch (err) {
      if (err.name === "AbortError") {
        // request was aborted, so we don't care about this error
      } else {
        this.onLoadError(err)
      }
      return false
    }

    this.merge(i, { loading: false, statusCode: this.states[i].statusCode || 200 })
    this.i = i
    if (this.states.length > this.maxStates) {
      this.states.splice(0, this.states.length - this.maxStates)
      this.i = this.maxStates - 1
    }
    return true
  }
  abortLoading() {
    this.states.forEach((state) => {
      state.abortController?.abort()
      state.loading = false
    })
  }
  setStatus(statusCode: TStatusCode) {
    this.states[this.i + 1].statusCode = statusCode
  }
  set404 = (): void => {
    this.setStatus(404)
  }
}
