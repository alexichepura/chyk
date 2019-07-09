import { inject, injectable } from "inversify"
import { useEffect, useState } from "react"
import { match } from "react-router"
import { TConfig } from "./config"
import { useDiContainer } from "./di"
import { TLoadData, TRouteConfig } from "./route-service"
import { Symbols } from "./symbols"

export const useDataService = (): DataService => useDiContainer().get(Symbols.dataService)

@injectable()
export class DataService {
  ssr_data: any | null
  constructor(@inject(Symbols.config) config: TConfig) {
    this.ssr_data = config.IS_BROWSER ? { ...(window as any).ssr_data } : null
  }

  set(ssr_data: any) {
    this.ssr_data = ssr_data
  }
}

function useDataLoader<T, M = {}>(match: match<M>, loader: TLoadData<T, M>) {
  const container = useDiContainer()
  return () => loader(match, container)
}
function useSsrData<T>(dataKey: string | undefined): T | null {
  const dataService = useDataService()
  if (!dataKey) {
    return null
  }
  const data = dataService.ssr_data && dataService.ssr_data[dataKey]
  if (data) {
    if (process.env.IS_BROWSER) {
      dataService.ssr_data[dataKey] = null // cleanup cached data to ensure one-time usage
    }
    return data
  }
  return null
}

const useLoaderAndData: TUseRouteData = ({ match, route }) => {
  if (!route.loadData) {
    throw new Error("route.loadData required")
  }
  if (!route.dataKey) {
    throw new Error("route.dataKey required")
  }
  const loader = useDataLoader(match, route.loadData)
  const data = useSsrData(route.dataKey)
  return [loader, data]
}
type TUsePageData = (props: { match: match; route: TRouteConfig }, set: (data: any) => void) => void

export const useSetPageData: TUsePageData = (props, set) => {
  const [loader, data] = useLoaderAndData(props)
  if (data) {
    set(data)
  }
  useEffect(() => {
    if (!data) {
      loader().then(set)
    }
  }, [])
}

type TUseRouteData = (props: { match: match; route: TRouteConfig }) => any
export const useStatePageData: TUseRouteData = props => {
  const [loader, data] = useLoaderAndData(props)
  const [state_data, set] = useState<any | null>(data)
  useEffect(() => {
    if (!state_data) {
      loader().then(set)
    }
  }, [])
  return state_data
}
