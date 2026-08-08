import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
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
import ProfilePage from '@/pages/ProfilePage'
import PublicProfilePage from '@/pages/PublicProfilePage'
import NotFoundPage from '@/pages/NotFoundPage'

// The editors pull in Tiptap/ProseMirror, which is the single heaviest dependency here and is
// useless to a reader. Splitting them keeps it out of the bundle everyone downloads.
const CourseEditorPage = lazy(() => import('@/pages/CourseEditorPage'))
const PostEditorPage = lazy(() => import('@/pages/PostEditorPage'))

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cursos" element={<CourseListPage />} />
          <Route path="/posts" element={<PostListPage />} />
          <Route path="/posts/:nickname/:slug" element={<PostViewPage />} />
          <Route path="/users/:nickname" element={<PublicProfilePage />} />

          {/* Reachable right after registering, before a nickname exists. */}
          <Route element={<ProtectedRoute requireNickname={false} />}>
            <Route path="/setup-nickname" element={<SetupNicknamePage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/posts/new" element={<PostEditorPage />} />
            <Route path="/posts/:id/edit" element={<PostEditorPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<FullHeightLayout />}>
          <Route path="/courses/:nickname/:slug" element={<CourseViewPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/courses/:nickname/:slug/edit" element={<CourseEditorPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
