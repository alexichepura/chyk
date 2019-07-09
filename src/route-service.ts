import { Container, inject, injectable } from "inversify"
import { match } from "react-router"
import { matchRoutes, RouteConfig } from "react-router-config"
import { isAsyncComponent, TAsyncComponent } from "./async-component"
import { DataService } from "./data-service"
import { Symbols } from "./symbols"

export type TLoadData<T, M = {}> = (match: match<M>, container: Container) => Promise<T>

export type TRouteConfig = RouteConfig & {
  loadData?: TLoadData<any, any>
  dataKey?: string
  routes?: TRouteConfig[]
}

type TPromiseConfig = {
  dataKey: string
  promise: Promise<any>
}

@injectable()
export class RouteService {
  constructor(
    @inject(Symbols.dataService) private readonly dataService: DataService,
    @inject(Symbols.container) private readonly container: Container,
    @inject(Symbols.url) private readonly url: URL,
    @inject(Symbols.routes) private readonly routes: TRouteConfig[]
  ) {}

  async load(): Promise<any> {
    const loaded_data = await this.loadBranchDataObject(this.url.pathname, this.routes)
    this.dataService.set(loaded_data)
    return loaded_data
  }

  ensureComponentsReady(): Promise<React.ComponentType[]> {
    const components = ensure_component_ready(this.url.pathname, this.routes)
    return components
  }

  loadBranchDataObject = async (url: string, routes: TRouteConfig[]) => {
    const branch = matchRoutes(routes, url)
    const promisesConfig: TPromiseConfig[] = branch
      .map(
        ({ route, match }: { route: TRouteConfig; match: match<any> }): TPromiseConfig => {
          return route.loadData
            ? {
                dataKey: route.dataKey,
                promise: route
                  .loadData(match, this.container)
                  .then((res: any) => (res && res.data ? res.data : res)),
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
      {} as Record<string, any>
    )
    return resultsObject
  }
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
