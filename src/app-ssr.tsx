import { inject, injectable } from "inversify"
import React, { FC } from "react"
import { StaticRouter, StaticRouterContext } from "react-router"
import { renderRoutes } from "react-router-config"
import { RouteService, TRouteConfig } from "./route-service"
import { Symbols } from "./symbols"

@injectable()
export class AppSsr {
  context: StaticRouterContext = {}
  constructor(
    @inject(Symbols.routeService) private readonly routeService: RouteService,
    @inject(Symbols.routes) private readonly routes: TRouteConfig[],
    @inject(Symbols.url) private readonly url: URL
  ) {}
  load = async () => {
    const [data] = await Promise.all([
      this.routeService.load(),
      this.routeService.ensureComponentsReady(),
    ])
    return data
  }
  render: FC = () => {
    return (
      <StaticRouter location={this.url.pathname} context={this.context}>
        {renderRoutes(this.routes)}
      </StaticRouter>
    )
  }
}
