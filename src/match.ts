import { match, RouteComponentProps } from "react-router"
import { MatchedRoute, RouteConfig } from "react-router-config"
import { isAsyncComponent, TAsyncComponent } from "./async-component"
import { Chyk } from "./chyk"

type TLoadDataProps<M> = {
  chyk: Chyk
  match: match<M>
  abortController: AbortController
}
export type TLocationData = any
export type TLoadDataResult<D = TLocationData> = D
export type TLoadData<D, M, Deps> = (
  options: TLoadDataProps<M>,
  deps: Deps
) => Promise<TLoadDataResult<D>>

export type TRouteConfig = RouteConfig & {
  loadData?: TLoadData<any, any, any>
  dataKey?: string
  routes?: TRouteConfig[]
  abortController?: AbortController
}

export type TRouteComponentProps<D, P = any> = RouteComponentProps<P> & {
  route: TRouteConfig
  abortController?: AbortController
} & D

type TPromiseConfig = {
  dataKey: string
  promise: Promise<any>
}

export const loadBranchDataObject = async (
  chyk: Chyk,
  matches: MatchedRoute<{}>[],
  abortController: AbortController
): Promise<TLoadDataResult> => {
  const promisesConfig: TPromiseConfig[] = matches
    .map(
      ({ route, match }: { route: TRouteConfig; match: match<any> }): TPromiseConfig => {
        return route.loadData
          ? {
              dataKey: match.url,
              promise: route.loadData({ chyk, match, abortController }, chyk.deps),
            }
          : (Promise.resolve(null) as any)
      }
    )
    .filter(Boolean)

  const results = await Promise.all(promisesConfig.map((c) => c.promise))
  const resultsObject = results.reduce((prev, current, index) => {
    prev[promisesConfig[index].dataKey] = current
    return prev
  }, {} as Record<string, TLoadDataResult>)
  return resultsObject
}

export function loadBranchComponents(matches: MatchedRoute<{}>[]): Promise<React.ComponentType[]> {
  return Promise.all(
    matches.map((match) => {
      const component = match.route.component as React.ComponentType | TAsyncComponent
      if (isAsyncComponent(component)) {
        return component.load()
      }
      return component
    })
  )
}
