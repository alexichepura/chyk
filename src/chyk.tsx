import { Action, createLocation, Location } from "history"
import { ComponentType } from "react"
import { getBranchKeys, getKey, loadBranchDataObject, TRouteConfig } from "./branch"

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

export type TGetBranch = (routes: TRouteConfig[], pathname: string) => TBranchItem[]
type TBranchItemsMapper<BI extends TBranchItem = TBranchItem> = (
  branchItem: BI,
  abortController: AbortController
) => any

type TChykProps = {
  data?: Record<string, any>
  statusCode?: TStatusCode
  branchItemsMapper: TBranchItemsMapper
  onLoadError?: (err: Error) => void
}

export class Chyk {
  onLoadError: (err: Error) => void = (err) => {
    throw err
  }
  branchItemsMapper: TBranchItemsMapper
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

  constructor(props: TChykProps) {
    this.branchItemsMapper = props.branchItemsMapper
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
    const location = createLocation(pathname)
    const i = this.i + 1
    const abortController =
      "AbortController" in global
        ? new AbortController()
        : ({ signal: { aborted: false } } as AbortController)

    const keys = getBranchKeys(branch)

    if (i === 0) {
      this.merge(0, { location, keys })
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
      location,
      pathname,
      abortController,
      loading: true,
    })

    try {
      const [loadedData] = await Promise.all([
        loadBranchDataObject(diffedMatches, (branchItem) => {
          return this.branchItemsMapper(branchItem, abortController)
        }),
        // loadBranchComponents(branch),
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
