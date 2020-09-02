import { createBrowserHistory, createLocation, History, Location } from "history"
import { ComponentType } from "react"
import { StaticRouterContext } from "react-router"
import { MatchedRoute, matchRoutes } from "react-router-config"
import { loadBranchComponents, loadBranchDataObject, TLocationData, TRouteConfig } from "./match"
import { chykHydrateOrRender } from "./render"

export type TStatusCode = number

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
    return Object.values(this.locationStates).some((state) => state.loading)
  }

  private locationStates: TChykLocationsStates = {}
  private location: Location = { pathname: "" } as any

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
      this.location = this.history.location
      this.listen()
      this.mergeLocationState(this.location.pathname, {
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

  upsertLocationStateLoading(
    abortController: AbortController,
    pathname: string,
    matches: MatchedRoute<{}>[],
    location: Location
  ) {
    this.mergeLocationState(pathname, {
      matches,
      pathname,
      location,
      abortController,
      statusCode: 200,
      loading: true,
    })
  }
  updateLocationStateLoaded(pathname: string, data: any) {
    this.mergeLocationState(pathname, {
      data,
      loading: false,
    })
  }
  private mergeLocationState(pathname: string, state: Partial<TChykLocationState>) {
    const _state = this.locationStates[pathname] || {}
    this.locationStates[pathname] = Object.assign(_state, state)
  }

  getLocationState(pathname: string): TChykLocationState {
    return this.locationStates[pathname]
  }
  get locationState(): TChykLocationState {
    return this.locationStates[this.location.pathname]
  }
  get statusCode(): TStatusCode {
    return this.locationState.statusCode
  }
  get data(): any {
    return this.locationState.data
  }
  cleanLocationState(pathname: string) {
    delete this.locationStates[pathname]
  }

  loadData = async (_location: string | Location): Promise<boolean> => {
    try {
      const abortController = this.isBrowser
        ? new AbortController()
        : ({ signal: { aborted: false } } as AbortController) // mock on server

      const location = typeof _location === "string" ? createLocation(_location) : _location
      const { pathname } = location

      const matches = matchRoutes(this.routes, pathname)
      this.upsertLocationStateLoading(abortController, pathname, matches, location)
      const [data] = await Promise.all([
        loadBranchDataObject(this, matches, abortController),
        loadBranchComponents(matches),
      ])

      this.location = location
      this.updateLocationStateLoaded(pathname, data)
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
    Object.values(this.locationStates).forEach((state) => {
      state.abortController && state.abortController.abort()
      state.loading = false
    })
  }

  get is404(): boolean {
    return this.statusCode === 404
  }
  setStatus(statusCode: TStatusCode) {
    Object.values(this.locationStates).forEach((state) => {
      if (state.loading) {
        state.statusCode = statusCode
      }
    })
  }
  set404 = (): void => {
    this.setStatus(404)
  }

  handleLocationChange = async (new_location: Location): Promise<boolean> => {
    const location = this.locationState.location
    // console.log("handleLocationChange: ", location.pathname, new_location.pathname)
    if (location.pathname === new_location.pathname) {
      return false
    }

    this.abortLoading()
    if (this.getLocationState(new_location.pathname)) {
      return false
    }

    const is_success = await this.loadData(new_location)
    this.cleanLocationState(is_success ? location.pathname : new_location.pathname)
    return true
  }

  listen = () => {
    this.history?.listen((location) => {
      // console.log("listen", { ...location })
      this.switchRoute && this.switchRoute(location)
    })
  }

  switchRoute: null | ((location: Location) => void) = null
}
