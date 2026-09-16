import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FullHeightLayout, Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RouteErrorBoundary } from '@/components/layout/RouteErrorBoundary'
import { PageLoader } from '@/components/ui/Feedback'
import { usePrefetchCatalogs } from '@/hooks/usePrefetchCatalogs'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import SetupNicknamePage from '@/pages/SetupNicknamePage'
import SearchPage from '@/pages/SearchPage'
import CertificateViewPage from '@/pages/CertificateViewPage'
import CourseViewPage from '@/pages/CourseViewPage'
import PostViewPage from '@/pages/PostViewPage'
import TrilhaViewPage from '@/pages/TrilhaViewPage'
import LibraryPage from '@/pages/LibraryPage'
import LibraryFolderPage from '@/pages/LibraryFolderPage'
import ConversationListPage from '@/pages/ConversationListPage'
import MessageThreadPage from '@/pages/MessageThreadPage'
import ProfilePage from '@/pages/ProfilePage'
import PublicProfilePage from '@/pages/PublicProfilePage'
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage'
import SchoolPage from '@/pages/SchoolPage'
import SchoolsListPage from '@/pages/SchoolsListPage'
import AdminAreasPage from '@/pages/admin/AdminAreasPage'
import AdminHomePage from '@/pages/admin/AdminHomePage'
import AdminModerationPage from '@/pages/admin/AdminModerationPage'
import AdminSchoolsPage from '@/pages/admin/AdminSchoolsPage'
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
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
      { path: '/redefinir-senha', element: <ResetPasswordPage /> },
      { path: '/privacidade', element: <PrivacyPolicyPage /> },
      { path: '/users/:nickname', element: <PublicProfilePage /> },
      { path: '/escolas', element: <SchoolsListPage /> },
      { path: '/escolas/:slug', element: <SchoolPage /> },

      { path: '/pesquisar', element: <SearchPage /> },
      { path: '/posts/:nickname/:slug', element: <PostViewPage /> },
      { path: '/trilhas/:nickname/:slug', element: <TrilhaViewPage /> },

      {
        element: <ProtectedRoute />,
        children: [
          { path: '/posts/new', element: lazyPage(PostEditorPage) },
          { path: '/posts/:id/edit', element: lazyPage(PostEditorPage) },
          { path: '/trilhas/:nickname/:slug/edit', element: lazyPage(TrilhaEditorPage) },
        ],
      },

      {
        // Your library is just yours to look at, not content you publish, so it does not need
        // a nickname the way creating a course/post/trilha does.
        element: <ProtectedRoute requireNickname={false} />,
        children: [
          { path: '/biblioteca/pastas/:folderId', element: <LibraryFolderPage /> },
          { path: '/trilhas/:nickname/:slug/certificado', element: <CertificateViewPage kind="trilha" /> },
          { path: '/courses/:nickname/:slug/certificado', element: <CertificateViewPage kind="course" /> },
        ],
      },

      {
        // Reachable right after registering, before a nickname exists.
        element: <ProtectedRoute requireNickname={false} />,
        children: [{ path: '/setup-nickname', element: <SetupNicknamePage /> }],
      },

      {
        element: <ProtectedRoute />,
        children: [{ path: '/profile', element: <ProfilePage /> }],
      },

      {
        // A DM conversation isn't content you publish under your own nickname, so no area either.
        element: <ProtectedRoute requireNickname={false} />,
        children: [
          { path: '/mensagens', element: <ConversationListPage /> },
          { path: '/mensagens/:nickname', element: <MessageThreadPage /> },
        ],
      },

      {
        element: <ProtectedRoute requireNickname={false} requireAdmin />,
        children: [
          { path: '/admin/areas', element: <AdminAreasPage /> },
          { path: '/admin/schools', element: <AdminSchoolsPage /> },
          { path: '/admin/home', element: <AdminHomePage /> },
          { path: '/admin/moderacao', element: <AdminModerationPage /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <FullHeightLayout />,
    errorElement: <RouteErrorBoundary />,
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
  // Warms the catalogue caches once per app load, so the first visit to any of the four listing
  // screens doesn't have to wait on a network round-trip.
  usePrefetchCatalogs()

  return <RouterProvider router={router} />
}
