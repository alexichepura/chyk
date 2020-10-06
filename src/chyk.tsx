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
  abortController: AbortController
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
  get isBrowser(): boolean {
    return Boolean(this.history)
  }
  get loading(): boolean {
    return Object.values(this.states).some((state) => state.loading)
  }

  states: TStates = []
  i: number = 0

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
      this.mergeLocationState(this.i, {
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
  private mergeLocationState(i: number, state: Partial<TState>) {
    const _state = this.states[i] || {}
    this.states[i] = Object.assign(_state, state)
  }

  getLocationState(i: number): TState {
    return this.states[i]
  }
  get locationState(): TState {
    return this.states[this.i]
  }
  get statusCode(): TStatusCode {
    return this.locationState.statusCode
  }
  get data(): any {
    return this.locationState.data
  }
  // cleanLocationState(pathname: string) {
  //   delete this.locationStates[pathname]
  // }

  matchesData: Record<string, any> = {}

  loadData = async (_location: string | Location): Promise<boolean> => {
    try {
      const abortController = this.isBrowser
        ? new AbortController()
        : ({ signal: { aborted: false } } as AbortController) // mock on server

      const location = typeof _location === "string" ? createLocation(_location) : _location
      const { pathname } = location

      const matches = matchRoutes(this.routes, pathname)
      const diffedMatches = matches.filter((m) => !this.matchesData[m.match.url])
      const i = this.i + 1
      this.mergeLocationState(i, {
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
      this.i = i
      Object.entries(loadedData).forEach(([key, matchData]) => {
        this.matchesData[key] = matchData
      })

      const matchesData = matches.reduce<Record<string, any>>((p, c) => {
        p[c.route.dataKey] = this.matchesData[c.match.url]
        return p
      }, {})

      this.mergeLocationState(i, {
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
    Object.values(this.states).forEach((state) => {
      state.abortController && state.abortController.abort()
      state.loading = false
    })
  }

  get is404(): boolean {
    return this.statusCode === 404
  }
  setStatus(statusCode: TStatusCode) {
    Object.values(this.states).forEach((state) => {
      if (state.loading) {
        state.statusCode = statusCode
      }
    })
  }
  set404 = (): void => {
    this.setStatus(404)
  }
}
