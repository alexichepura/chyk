import { createBrowserHistory, createLocation, History, Location } from "history"
import { StaticRouterContext } from "react-router"
import { MatchedRoute, matchRoutes } from "react-router-config"
import { loadBranchComponents, loadBranchDataObject, TLocationData, TRouteConfig } from "./match"
import { chykHydrateOrRender } from "./render"
import { ComponentType } from "react"

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
  component?: ComponentType
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
  component?: ComponentType
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
    this.component = props.component
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
}
