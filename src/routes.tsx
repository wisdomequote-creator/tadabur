import type { RouteRecord } from 'vite-react-ssg'
import type { LoaderFunctionArgs } from 'react-router-dom'
import Layout from './components/Layout'
import { loadSurahData } from './data/loader'
import { TOTAL_SURAHS } from './lib/constants'

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, lazy: () => import('./pages/Home') },
      { path: 'surahs', lazy: () => import('./pages/Surahs') },
      { path: 'search', lazy: () => import('./pages/Search') },
      { path: 'asbab', lazy: () => import('./pages/Asbab') },
      {
        path: 'surah/:number',
        // Loader is static (not in the lazy module) so vite-react-ssg can wrap it
        // for static loader data; the component stays lazy for code-splitting.
        loader: ({ params }: LoaderFunctionArgs) =>
          loadSurahData(Number(params.number)),
        lazy: () => import('./pages/Surah'),
        // Every surah is prerendered to its own real HTML file.
        getStaticPaths: () =>
          Array.from({ length: TOTAL_SURAHS }, (_, i) => `/surah/${i + 1}`),
      },
      { path: '*', lazy: () => import('./pages/NotFound') },
    ],
  },
]
