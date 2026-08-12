import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FullHeightLayout, Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageLoader } from '@/components/ui/Feedback'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import SetupNicknamePage from '@/pages/SetupNicknamePage'
import CourseListPage from '@/pages/CourseListPage'
import CourseViewPage from '@/pages/CourseViewPage'
import PostListPage from '@/pages/PostListPage'
import PostViewPage from '@/pages/PostViewPage'
import TrilhaListPage from '@/pages/TrilhaListPage'
import TrilhaViewPage from '@/pages/TrilhaViewPage'
import LibraryPage from '@/pages/LibraryPage'
import LibraryFolderPage from '@/pages/LibraryFolderPage'
import ProfilePage from '@/pages/ProfilePage'
import PublicProfilePage from '@/pages/PublicProfilePage'
import NotFoundPage from '@/pages/NotFoundPage'

// The editors pull in Tiptap/ProseMirror, which is the single heaviest dependency here and is
// useless to a reader. Splitting them keeps it out of the bundle everyone downloads.
const CourseEditorPage = lazy(() => import('@/pages/CourseEditorPage'))
const PostEditorPage = lazy(() => import('@/pages/PostEditorPage'))
const TrilhaEditorPage = lazy(() => import('@/pages/TrilhaEditorPage'))

/** Wraps a lazy-loaded page element so Suspense only has to cover the routes that actually split. */
function lazyPage(Page) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  )
}

// A data router (rather than <BrowserRouter>/<Routes>) is required for useBlocker, which the
// unsaved-changes guard on the editor pages relies on.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/cursos', element: <CourseListPage /> },
      { path: '/posts', element: <PostListPage /> },
      { path: '/posts/:nickname/:slug', element: <PostViewPage /> },
      { path: '/trilhas', element: <TrilhaListPage /> },
      { path: '/trilhas/:nickname/:slug', element: <TrilhaViewPage /> },
      { path: '/users/:nickname', element: <PublicProfilePage /> },

      {
        // Reachable right after registering, before a nickname exists.
        element: <ProtectedRoute requireNickname={false} />,
        children: [{ path: '/setup-nickname', element: <SetupNicknamePage /> }],
      },

      {
        element: <ProtectedRoute />,
        children: [
          { path: '/profile', element: <ProfilePage /> },
          { path: '/posts/new', element: lazyPage(PostEditorPage) },
          { path: '/posts/:id/edit', element: lazyPage(PostEditorPage) },
          { path: '/trilhas/:nickname/:slug/edit', element: lazyPage(TrilhaEditorPage) },
        ],
      },

      {
        // Your library is just yours to look at, not content you publish, so it does not need
        // a nickname the way creating a course/post/trilha does.
        element: <ProtectedRoute requireNickname={false} />,
        children: [{ path: '/biblioteca/pastas/:folderId', element: <LibraryFolderPage /> }],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <FullHeightLayout />,
    children: [
      { path: '/courses/:nickname/:slug', element: <CourseViewPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/courses/:nickname/:slug/edit', element: lazyPage(CourseEditorPage) }],
      },
      {
        element: <ProtectedRoute requireNickname={false} />,
        children: [{ path: '/biblioteca', element: <LibraryPage /> }],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
