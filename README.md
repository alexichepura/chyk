# chyk

<img src="https://i.imgur.com/0fU07ox.png">

---

Chyk is a microframework to build universal SPAs with React.
Simplifies and unifies:

- preload route data
- preload route components
- passing SSR data to the browser for the immediate hydration
- aborting data load if switched to another route
- 404 and other status pages

## Install

```s
yarn add chyk
```

## Usage

### Server

```ts
createServer(async (request, response) => {
  try {
    const pathname: string = request.url || ""
    const chyk = new Chyk<TDeps>({ routes, deps: { apiSdk: new DbClient() } })
    await chyk.loadData(pathname)
    const html = renderToString(createElement(ChykStaticComponent, { chyk }))
    const { data, statusCode } = chyk.currentLocationState
    response.statusCode = statusCode
    response.end(template({ html, data, statusCode }))
  } catch (e) {
    console.log(e)
    response.end(e)
  }
})
```

### Browser

```ts
new Chyk<TDeps>({
  routes,
  data: (window as any).ssr_data,
  statusCode: (window as any).ssr_statusCode,
  el: document.getElementById("app"),
  deps: { apiSdk: new DbClient() },
})
```

### Routes

```ts
export const routes: TRouteConfig[] = [
  {
    component: Layout as FC,
    dataKey: "layout",
    loadData: layoutLoader,
    routes: [
      {
        path: "/",
        exact: true,
        component: Home as FC,
        dataKey: "home",
        loadData: homeLoader,
      },
      {
        path: "/:slug",
        component: Article as FC,
        exact: true,
        dataKey: "article",
        loadData: articleLoader,
      },
      {
        component: NotFound as FC,
        loadData: async ({ chyk }) => chyk.set404(),
      },
    ],
  },
]
```

### Loaders

```ts
const layoutLoader: TAppLoadData<TLayoutData> = async ({
  abortController,
  props: { apiClient },
}) => {
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
