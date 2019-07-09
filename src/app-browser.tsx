import { createBrowserHistory } from "history"
import { inject, injectable } from "inversify"
import React, { FC } from "react"
import { Router } from "react-router"
import { renderRoutes } from "react-router-config"
import { RouteService, TRouteConfig } from "./route-service"
import { Symbols } from "./symbols"

@injectable()
export class AppBrowser {
  history = createBrowserHistory()
  constructor(
    @inject(Symbols.routeService) private readonly routeService: RouteService,
    @inject(Symbols.routes) private readonly routes: TRouteConfig[]
  ) {}
  loadData = this.routeService.load
  ensureComponentsReady = this.routeService.ensureComponentsReady
  load = async () => {
    await this.ensureComponentsReady()
  }
  render: FC = () => {
    return <Router history={this.history}>{renderRoutes(this.routes)}</Router>
  }
}
