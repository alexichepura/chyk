import { createBrowserHistory, createLocation, History, Location } from "history"
import { ComponentType } from "react"
import { StaticRouterContext } from "react-router"
import { MatchedRoute, matchRoutes } from "react-router-config"
import { loadBranchComponents, loadBranchDataObject, TLocationData, TRouteConfig } from "./match"
import { chykHydrateOrRender } from "./render"

export type TStatusCode = number

export type TState = {
  pathname: string
  matches: MatchedRoute<{}>[]
  abortController?: AbortController
  location: Location
  loading: boolean
  statusCode: TStatusCode
  data?: TLocationData
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

  states: TStates = []
  i: number = 0
  matchesData: Record<string, any> = {}

  get state(): TState {
    return this.states[this.i]
  }
  get data(): any {
    return this.state.data
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
    if (this.history) {
      this.merge(this.i, {
        data: props.data,
        location: this.history.location,
        ...(props.statusCode ? { statusCode: props.statusCode } : null),
      })
      this.loadAndRender(Boolean(props.data))
    }
  }

  async loadAndRender(disableDataLoading: boolean) {
    if (!this.history) {
      throw "No history"
    }
    if (!disableDataLoading) {
      await this.loadData(this.history.location)
    } else {
      const matches = matchRoutes(this.routes, this.history.location.pathname)
      await loadBranchComponents(matches)
    }
    chykHydrateOrRender(this)
  }
  private merge(i: number, state: Partial<TState>) {
    this.states[i] = { ...(this.states[i] || {}), ...state }
  }

  loadData = async (_location: string | Location): Promise<boolean> => {
    try {
      const abortController = Boolean(this.history)
        ? new AbortController()
        : ({ signal: { aborted: false } } as AbortController) // mock on server

      const location = typeof _location === "string" ? createLocation(_location) : _location
      const { pathname } = location

      const matches = matchRoutes(this.routes, pathname)
      const diffedMatches = matches.filter((m) => !this.matchesData[m.match.url])
      const i = this.i + 1
      this.merge(i, {
        matches,
        pathname,
        location,
        abortController,
        statusCode: 200,
        loading: true,
      })

      const [loadedData] = await Promise.all([
        loadBranchDataObject(this, diffedMatches, abortController),
        loadBranchComponents(matches),
      ])
      console.log(matches, diffedMatches, loadedData)
      this.i = i
      Object.entries(loadedData).forEach(([key, matchData]) => {
        this.matchesData[key] = matchData
      })

      const matchesData = matches.reduce<Record<string, any>>((p, c) => {
        p[c.route.dataKey] = this.matchesData[c.match.url]
        return p
      }, {})
      // console.log(loadedData, this.matchesData, matchesData)
      this.merge(i, {
        data: matchesData,
        loading: false,
      })
      return true
    } catch (err) {
      if (err.name === "AbortError") {
        // request was aborted, so we don't care about this error
        // console.log("AbortError", err)
      } else {
        this.onLoadError(err)
      }
      return false
    }
  }
  abortLoading() {
    console.log("abortLoading")
    this.states.forEach((state) => {
      state.abortController?.abort()
      state.loading = false
    })
  }

  setStatus(statusCode: TStatusCode) {
    this.states.forEach((state) => {
      if (state.loading) state.statusCode = statusCode
    })
  }
  set404 = (): void => {
    this.setStatus(404)
  }
}
