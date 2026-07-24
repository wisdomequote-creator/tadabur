import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import { ViteReactSSG } from 'vite-react-ssg'
import { routes } from './routes'
import './styles/global.css'

declare global {
  interface Window {
    __staticRouterHydrationData?: Parameters<typeof createBrowserRouter>[1] extends
      | { hydrationData?: infer H }
      | undefined
      ? H
      : never
  }
}

export const createRoot = ViteReactSSG({
  routes,
  // vite-react-ssg inlines the SSR loader data as window.__staticRouterHydrationData
  // but does not forward it to the router. Without it, routes with a loader (the
  // surah pages) hydrate with undefined data and crash. Forward it here.
  customCreateRouter: (routerRoutes, options) =>
    createBrowserRouter(routerRoutes as RouteObject[], {
      ...options,
      hydrationData:
        typeof window !== 'undefined' ? window.__staticRouterHydrationData : undefined,
    }),
})
