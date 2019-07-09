import { inject, injectable } from "inversify"
import React, { FC } from "react"
import { StaticRouter, StaticRouterContext } from "react-router"
import { renderRoutes } from "react-router-config"
import { TConfig } from "./config"
import { RouteService, TRouteConfig } from "./route-service"
import { Symbols } from "./symbols"
import { getEntryAssetsScripts, getWebpackAssetsManifest } from "./webpack-assets-manifest"

@injectable()
export class AppSsr {
  context: StaticRouterContext = {}
  scripts: string = ""
  constructor(
    @inject(Symbols.routeService) private readonly routeService: RouteService,
    @inject(Symbols.routes) private readonly routes: TRouteConfig[],
    @inject(Symbols.config) private readonly config: TConfig,
    @inject(Symbols.url) private readonly url: URL
  ) {}
  loadScripts = async () => {
    const manifest = await getWebpackAssetsManifest<any>(this.config.SCRIPTS_URL)
    this.scripts = getEntryAssetsScripts(
      this.config.SCRIPTS_URL,
      manifest.entrypoints[this.config.MANIFEST_ENTRYPOINT].js
    )
    return this.scripts
  }
  loadData = this.routeService.load
  ensureComponentsReady = this.routeService.ensureComponentsReady
  load = async () => {
    const [data] = await Promise.all([this.loadData(), this.ensureComponentsReady()])
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
