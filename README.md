# chyk

<img src="https://i.imgur.com/0fU07ox.png">

---

Chyk is a microframework to build universal SPAs with React.

## Features

- preload route data
- code splitting via async components
- passing SSR data to the browser for the immediate hydration
- aborting data load using [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort) if switched to another route
- 404 and other status pages

## Bonus

- Written in TypeScript
- Zero dependencies
- Only peer dependencies: react, react-dom, react-router, react-router-dom, react-router-config, history
- [**2.4kB gzipped**](https://bundlephobia.com/result?p=chyk)

## Install

```s
yarn add chyk
```

## Usage

[Example](https://github.com/palessit/chyk/tree/master/example)

### Server

```ts
createServer(async (request, response) => {
  try {
    const pathname = request.url || ""
    const chyk = new Chyk({ routes, deps: { apiSdk: new DbClient() } })
    await chyk.loadData(pathname)
    const html = renderToString(createElement(ChykStaticComponent, { chyk }))
    const { data, statusCode } = chyk.locationState
    response.statusCode = statusCode
    response.end(template({ html, data, statusCode }))
  } catch (e) {
    logger(e)
    response.end(e)
  }
})
```

### Browser

```ts
new Chyk({
  routes,
  deps: { apiSdk: new DbClient() },
  data: window.ssr_data,
  statusCode: window.ssr_statusCode,
  el: document.getElementById("app"),
})
```

### Routes

```ts
export const routes = [
  {
    component: Layout,
    dataKey: "layout",
    loadData: layoutLoader,
    routes: [
      {
        path: "/",
        exact: true,
        component: Home,
        dataKey: "home",
        loadData: homeLoader,
      },
      {
        path: "/:slug",
        component: Article,
        exact: true,
        dataKey: "article",
        loadData: articleLoader,
      },
      {
        component: NotFound,
        loadData: async ({ chyk }) => chyk.set404(),
      },
    ],
  },
]
```

### Loaders

```ts
const layoutLoader = async ({ abortController }, { apiClient }) => {
  const [year, articles] = await Promise.all([
    apiClient.getYear(abortController.signal),
    apiClient.getArticles(abortController.signal),
  ])
  return { year, articles }
}
```

## Example

```s
yarn example:server
```

```s
yarn example:wds
```
