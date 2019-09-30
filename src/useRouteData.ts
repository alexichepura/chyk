import { DependencyList, useEffect, useMemo, useState } from "react"
import { match } from "react-router"
import { useChyk } from "./hooks"
import { TRouteConfig } from "./match"

type TUseRouteDataProps = {
  match: match
  route: TRouteConfig
  deps?: DependencyList
  props?: any
}
export type TDataNullable<D = any> = null | D
type TUseRouteDataReturn<D = any> = {
  data: D | undefined
  loading: boolean
  error: Error | null
  abortController: AbortController
}
// type TUseRouteData<D = any> = (props: TUseRouteDataProps) => TUseRouteDataReturn<D>
// export function useRouteData<D = any>(props: TUseRouteDataProps): TUseRouteDataReturn<D>

export function useRouteData<D = any>({
  route,
  match,
  deps = [],
  props,
}: TUseRouteDataProps): TUseRouteDataReturn<D> {
  const { loadData, dataKey } = route
  if (!loadData) {
    throw new Error("route.loadData required")
  }
  if (!dataKey) {
    throw new Error("route.dataKey required")
  }
  const chyk = useChyk()
  const data = chyk.getData<D>(dataKey)
  const [state_data, state_set] = useState<D | undefined>(data)
  const [loading, set_loading] = useState<boolean>(false)
  const [error, set_error] = useState<Error | null>(null)
  const abortController = useMemo(
    () => (chyk.history ? new AbortController() : abort_controller_mock),
    deps
  )

  useEffect(() => {
    if (data) {
      return
    }
    set_loading(true)
    loadData({ chyk, match, abortController, props })
      .then((loaded_data: any) => {
        state_set(loaded_data)
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
