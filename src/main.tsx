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

// react-router basename must match Vite's base (without the trailing slash) so
// links resolve correctly when the site is served from a subpath (GitHub Pages).
const BASE = import.meta.env.BASE_URL
const basename = BASE === '/' ? '/' : BASE.replace(/\/$/, '')

export const createRoot = ViteReactSSG({
  routes,
  basename,
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
