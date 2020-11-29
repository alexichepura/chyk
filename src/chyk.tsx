import { Action, Location } from "history"
import { ComponentType } from "react"
import {
  getBranchesKeys,
  getKey,
  loadBranchComponents,
  loadBranchDataObject,
  TRouteConfig,
} from "./match"

export type TStatusCode = number
export type TBranchItem = { route: TRouteConfig; matchUrl: string }

export type TState = {
  pathname: string
  matches: TBranchItem[]
  abortController?: AbortController
  location: Location
  loading: boolean
  statusCode: TStatusCode
  keys: Record<string, string>
}
export type TStates = TState[]

type TGetBranch = (routes: TRouteConfig[] | undefined, pathname: string) => TBranchItem[]

type TChykProps<D = any> = {
  data?: Record<string, any>
  statusCode?: TStatusCode
  deps: D extends undefined ? never : D
  getBranches: TGetBranch
  onLoadError?: (err: Error) => void
}

export class Chyk<D = any> {
  onLoadError: (err: Error) => void = (err) => {
    throw err
  }
  deps: D extends undefined ? never : D
  getBranches: TGetBranch
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
    this.deps = props.deps
    this.getBranches = props.getBranches
    if (props.onLoadError) {
      this.onLoadError = props.onLoadError
    }
    if (props.data) {
      this.data = props.data
    }
    if (props.statusCode) {
      this.merge(0, { statusCode: props.statusCode })
    }
  }

  private merge(i: number, state: Partial<TState>) {
    this.states[i] = { ...(this.states[i] || {}), ...state }
  }

  loadData = async (branch: TBranchItem[], pathname: string, action?: Action): Promise<boolean> => {
    const i = this.i + 1
    const abortController =
      "AbortController" in global
        ? new AbortController()
        : ({ signal: { aborted: false } } as AbortController)

    const keys = getBranchesKeys(branch)

    if (i === 0) {
      this.merge(0, { keys })
    }
    const diffedMatches = branch.filter((branchItem) => {
      const key = getKey(branchItem.route.dataKey, branchItem.matchUrl)
      const data = key ? this.data[key] : null
      return (
        !data ||
        (action === "PUSH" &&
          branchItem.route.dataKey &&
          this.state.keys[branchItem.route.dataKey] !== keys[branchItem.route.dataKey])
      )
    })
    this.merge(i, {
      keys,
      pathname,
      abortController,
      loading: true,
    })

    try {
      const [loadedData] = await Promise.all([
        loadBranchDataObject(diffedMatches, () => [{ chyk: this, abortController }, this.deps]),
        loadBranchComponents(branch),
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
