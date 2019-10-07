import { match, RouteComponentProps } from "react-router"
import { matchRoutes, RouteConfig } from "react-router-config"
import { isAsyncComponent, TAsyncComponent } from "./async-component"
import { Chyk } from "./chyk"

type TLoadDataProps<M, P = any> = {
  chyk: Chyk
  match: match<M>
  abortController?: AbortController
  props: P
}
export type TLoadDataResult<D = any> = D
export type TLoadData<D, M, P> = (p: TLoadDataProps<M, P>) => Promise<TLoadDataResult<D>>

export type TRouteConfig = RouteConfig & {
  loadData?: TLoadData<any, any, any>
  dataKey?: string
  routes?: TRouteConfig[]
  abortController?: AbortController
}

export type TDataComponentProps<D, P = any> = RouteComponentProps<P> & {
  route: TRouteConfig
  data: D
}

type TPromiseConfig = {
  dataKey: string
  promise: Promise<any>
}

export const loadBranchDataObject = async (
  chyk: Chyk,
  pathname: string,
  routes: TRouteConfig[],
  props: any,
  abortController?: AbortController
): Promise<TLoadDataResult> => {
  const branch = matchRoutes(routes, pathname)
  const promisesConfig: TPromiseConfig[] = branch
    .map(
      ({ route, match }: { route: TRouteConfig; match: match<any> }): TPromiseConfig => {
        return route.loadData
          ? {
              dataKey: route.dataKey,
              promise: route.loadData({ chyk, match, abortController, props }),
            }
          : (Promise.resolve(null) as any)
      }
    )
    .filter(Boolean)

  const results = await Promise.all(promisesConfig.map(c => c.promise))
  const resultsObject = results.reduce(
    (prev, current, index) => {
      prev[promisesConfig[index].dataKey] = current
      return prev
    },
    {} as Record<string, TLoadDataResult>
  )
  return resultsObject
}

export function ensure_component_ready(
  url: string,
  routes: TRouteConfig[]
): Promise<React.ComponentType[]> {
  const matches = matchRoutes(routes, url)
  return Promise.all(
    matches.map(match => {
      const component = match.route.component as (React.ComponentType | TAsyncComponent)
      if (isAsyncComponent(component)) {
        return component.load()
      }
      return component
    })
  )
}
