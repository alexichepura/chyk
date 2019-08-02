import { inject, injectable } from "inversify"
import { DependencyList, useEffect, useMemo, useState } from "react"
import { match } from "react-router"
import { TConfig } from "./config"
import { useDiContainer } from "./di"
import { TRouteConfig } from "./route-service"
import { Symbols } from "./symbols"

export const useDataService = (): DataService => useDiContainer().get(Symbols.dataService)

@injectable()
export class DataService {
  ssr_data: any | null
  constructor(@inject(Symbols.config) private readonly config: TConfig) {
    this.ssr_data = this.config.IS_BROWSER ? { ...(window as any).ssr_data } : null
  }

  set(ssr_data: any) {
    this.ssr_data = ssr_data
  }
  get<D>(dataKey: string | undefined): TDataNullable<D> {
    if (!dataKey) {
      return null
    }
    const data = this.ssr_data && this.ssr_data[dataKey]
    if (data) {
      if (this.config.IS_BROWSER) {
        this.ssr_data[dataKey] = null // cleanup cached data to ensure one-time usage
      }
      return data
    }
    return null
  }
}

type TUseRouteDataProps = {
  match: match
  route: TRouteConfig
  set?: (data: any) => void
  deps?: DependencyList
}
type TDataNullable<D = any> = null | D
type TUseRouteDataReturn<D = any> = {
  data: TDataNullable<D>
  loading: boolean
  error: Error | null
  abortController: AbortController
}
// type TUseRouteData<D = any> = (props: TUseRouteDataProps) => TUseRouteDataReturn<D>
// export function useRouteData<D = any>(props: TUseRouteDataProps): TUseRouteDataReturn<D>

export function useRouteData<D = any>({
  route,
  match,
  set,
  deps = [],
}: TUseRouteDataProps): TUseRouteDataReturn<D> {
  const { loadData, dataKey } = route
  if (!loadData) {
    throw new Error("route.loadData required")
  }
  if (!dataKey) {
    throw new Error("route.dataKey required")
  }
  const container = useDiContainer()
  const config = container.get<TConfig>(Symbols.config)
  const data = useDataService().get<D>(route.dataKey)
  const [state_data, state_set] = useState<TDataNullable<D>>(data)
  const [loading, set_loading] = useState<boolean>(false)
  const [error, set_error] = useState<Error | null>(null)
  const abortController = useMemo(
    () => (config.IS_BROWSER ? new AbortController() : abort_controller_mock),
    deps
  )
  if (!config.IS_BROWSER) {
    set && set(data)
  }
  useEffect(() => {
    if (data) {
      set && set(data)
      return
    }
    set_loading(true)
    loadData(match, container, { abortController })
      .then((loaded_data: any) => {
        state_set(loaded_data)
        set && set(loaded_data)
        set_loading(false)
      })
      .catch(set_error)
    return () => {
      abortController.abort()
      set_loading(false)
      set_error(null)
    }
  }, deps)

  return { data: data || state_data, loading, error, abortController }
}

const abort_controller_mock: AbortController = {} as AbortController
// const shallow_check = (arr1, arr2)
