import { createBrowserHistory, History } from "history"
import React, { FC, useEffect, useState } from "react"
import { hydrate, render } from "react-dom"
import { Route, Router, StaticRouter, StaticRouterContext, useLocation } from "react-router"
import { renderRoutes } from "react-router-config"
import { ChykContext, useChyk } from "./hooks"
import {
  ensure_component_ready,
  loadBranchDataObject,
  TLoadDataResult,
  TRouteConfig,
} from "./match"

export type TChykCtx = {
  data?: any
  statusCode?: number
}

type TChykProps = {
  routes: TRouteConfig[]
  browser?: boolean
  ctx?: TChykCtx
  defaultProps?: any
}

export class Chyk {
  private _statusCode: number = 200

  setStatusCode(code: number) {
    // console.log("setStatusCode", code)
    this._statusCode = code
  }

  get statusCode() {
    return this._statusCode
  }

  routes: TRouteConfig[]
  data: any
  defaultProps: any
  staticRouterContext: StaticRouterContext = {}
  history: History | null

  constructor(props: TChykProps) {
    this.routes = props.routes
    this.data = props.ctx && props.ctx.data

    const initStatusCode = props.ctx && props.ctx.statusCode
    if (initStatusCode) {
      this.setStatusCode(initStatusCode)
    }

    this.history = props.browser ? createBrowserHistory() : null
    this.defaultProps = props.defaultProps
    this.listenHistory()
  }

  get ctx() {
    return {
      statusCode: this.statusCode,
      data: this.data,
    }
  }

  loadLocationData = async (props?: any) => {
    return this.loadData(this.history!.location.pathname, props)
  }

  loadData = async (pathname: string, props?: any) => {
    const [data] = await Promise.all([
      loadBranchDataObject(this, pathname, this.routes, {
        ...this.defaultProps,
        ...props,
      }),
      ensure_component_ready(pathname, this.routes),
    ])
    this.data = data
  }

  render: FC = () => {
    useEffect(() => {
      this.data = null
    }, [])
    return (
      <ChykContext.Provider value={this}>
        <Router history={this.history!}>
          <ChykPreloader />
        </Router>
      </ChykContext.Provider>
    )
  }

  renderStatic: FC<{ pathname: string }> = ({ pathname }) => {
    return (
      <ChykContext.Provider value={this}>
        <StaticRouter location={pathname} context={this.staticRouterContext}>
          {renderRoutes(this.routes)}
        </StaticRouter>
      </ChykContext.Provider>
    )
  }

  tryHydrate = (el: HTMLElement | null) => {
    const Component = this.render
    const renderMethod = el && el.childNodes.length === 0 ? render : hydrate
    renderMethod(<Component />, el)
  }

  getData<D>(dataKey: string): TLoadDataResult<D> {
    return this.data[dataKey]
  }
  set404 = (): void => {
    this.setStatusCode(404)
  }
  get is404(): boolean {
    return this.statusCode === 404
  }

  private listenHistory = () => {
    if (!this.history) {
      return
    }
    const history = this.history
    history.listen(() => {
      console.log("listenHistory", history.location.pathname)
      this.setStatusCode(200)
    })
  }
}

type TChykPreloaderProps = {}
// & RouteComponentProps<{}> & { route: TRouteConfig }
const ChykPreloader: FC<TChykPreloaderProps> = () => {
  const chyk = useChyk()
  const location = useLocation()
  console.log("location", location)
  const [state_location, setLocation] = useState(location)

  useEffect(() => {
    chyk.loadLocationData().then(() => {
      setLocation(location)
    })
  }, [location.key])

  return (
    <Route
      // location={previousLocation || location}
      location={state_location}
      // render={props => renderRoutes(chyk.routes, props)}
      render={() => renderRoutes(chyk.routes)}
    />
  )
}
