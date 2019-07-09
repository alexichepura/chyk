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
  constructor(
    @inject(Symbols.routeService) private readonly routeService: RouteService,
    @inject(Symbols.routes) private readonly routes: TRouteConfig[],
    @inject(Symbols.config) private readonly config: TConfig,
    @inject(Symbols.url) private readonly url: URL
  ) {}
  load = async () => {
    console.log("SCRIPTS_URL", this.config.SCRIPTS_URL)
    const manifest = await getWebpackAssetsManifest<any>(this.config.SCRIPTS_URL)
    console.log("manifest", manifest)
    const scripts = getEntryAssetsScripts(
      this.config.SCRIPTS_URL,
      manifest.entrypoints[this.config.MANIFEST_ENTRYPOINT].js
    )
    console.log(scripts)

    await this.routeService.load()
    await this.routeService.ensureComponentsReady()
  }
  render: FC = () => {
    return (
      <StaticRouter location={this.url.pathname} context={this.context}>
        {renderRoutes(this.routes)}
      </StaticRouter>
    )
  }
}
