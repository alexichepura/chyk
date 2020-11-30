import { RouteComponentProps } from "react-router"
import { RouteConfig } from "react-router-config"
import { isAsyncComponent, TAsyncComponent } from "./async-component"
import { TBranchItem } from "./chyk"

export type TRouteConfig = RouteConfig & {
  loadData?: (...args: any) => Promise<any>
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

type TLoadDataResult = any
export async function loadBranchDataObject(
  branches: TBranchItem[],
  branchItemsMapper: (branchItem: TBranchItem) => any[]
): Promise<TLoadDataResult> {
  const promisesConfig: TPromiseConfig[] = branches
    .map(
      (branchItem: TBranchItem): TPromiseConfig => {
        if (branchItem.route.loadData) {
          const loaderArgs = branchItemsMapper(branchItem)
          return {
            dataKey: getKey(branchItem.route.dataKey, branchItem.matchUrl) || "",
            promise: branchItem.route.loadData(...loaderArgs),
          }
        }
        return Promise.resolve(null) as any
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

export function loadBranchComponents(branches: TBranchItem[]): Promise<React.ComponentType[]> {
  return Promise.all(
    branches.map((match) => {
      const component = match.route.component as React.ComponentType | TAsyncComponent
      if (isAsyncComponent(component)) {
        return component.load()
      }
      return component
    })
  )
}

export const getKey = (k1: string | undefined, k2: string | undefined): string | undefined =>
  k1 && k2 ? k1 + ":" + k2 : undefined

export const getBranchKeys = (matches: TBranchItem[]) =>
  matches.reduce<Record<string, string>>((p, c) => {
    if (c.route.dataKey) {
      const key = getKey(c.route.dataKey, c.matchUrl)
      if (key) {
        p[c.route.dataKey] = key
      }
    }
    return p
  }, {})
