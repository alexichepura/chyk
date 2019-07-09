import { Container } from "inversify"
import { TConfig } from "./config"
import { DataService } from "./data-service"
import { RouteService, TRouteConfig } from "./route-service"
import { Symbols } from "./symbols"

type TBindProps = {
  config: TConfig
  url: URL
  routes: TRouteConfig[]
}
export const bindContainer = (props: TBindProps): Container => {
  const container = new Container()
  container.bind<Container>(Symbols.container).toConstantValue(container)
  container.bind<TConfig>(Symbols.config).toConstantValue(props.config)
  container.bind<URL>(Symbols.url).toConstantValue(props.url)
  container.bind<TRouteConfig[]>(Symbols.routes).toConstantValue(props.routes)
  container
    .bind<DataService>(Symbols.dataService)
    .to(DataService)
    .inSingletonScope()
  container
    .bind<RouteService>(Symbols.routeService)
    .to(RouteService)
    .inSingletonScope()
  return container
}
