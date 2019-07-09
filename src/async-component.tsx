import React from "react"

const containerStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
}

export class BundleError extends React.Component {
  onLine = true

  componentWillMount() {
    this.onLine = navigator.onLine
  }

  fullReload = () => {
    location.reload()
  }

  render() {
    return (
      <div style={containerStyle}>
        <div style={{ paddingBottom: "16px" }}>
          {this.onLine ? <div>Error</div> : <div>No connection</div>}
        </div>
        <button onClick={this.fullReload}>Reload</button>
      </div>
    )
  }
}

export type TAsyncComponent = React.ComponentType & {
  load: () => Promise<React.ComponentType>
}

export const isAsyncComponent = (
  component: React.ComponentType | TAsyncComponent
): component is TAsyncComponent => {
  return Boolean((component as TAsyncComponent).load)
}

type TComponentLoaderResponse = { default: React.ComponentType<any> }

export const asyncComponent = (
  componentLoader: () => Promise<TComponentLoaderResponse>
): TAsyncComponent => {
  let Component: React.ComponentType | null = null
  let isError = false
  const state = {
    loaded: false,
    loading: false,
  }

  const load = async (): Promise<void> => {
    if (Component) {
      return
    }
    if (state.loading) {
      return
    }
    try {
      state.loading = true
      const loaderResponse = await componentLoader()
      const _Component = loaderResponse.default
      Component = _Component
      isError = false
      state.loaded = true
    } catch (e) {
      console.error(e)
      isError = true
    }
    state.loading = false
  }

  function AsyncComponent(props: any) {
    React.useEffect(() => {
      load()
    }, [])

    if (!state.loaded) {
      return null
    }
    if (Component) {
      return <Component {...props} />
    }
    if (isError) {
      return <BundleError />
    }
    return null
  }

  AsyncComponent.load = async (): Promise<React.ComponentType> => {
    await load()
    return Component || BundleError
  }

  return AsyncComponent
}
