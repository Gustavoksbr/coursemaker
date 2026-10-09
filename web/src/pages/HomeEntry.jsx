import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import { PageLoader } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'

/**
 * What `/` does. A visitor sees the home page right there (it stays the site's front door, so links, search
 * results and previews keep pointing at it). Someone who is already signed in has little use for it - their
 * library is what they come for - so `/` sends them to /biblioteca; the home page is still one click away at
 * /inicio ("Inicio" in the navbar).
 *
 * The choice is made ONCE, when the page opens, from whether there was a session at that moment. Reacting to
 * the login state afterwards would be wrong: someone who signs in from the modal on this very page asked to
 * stay where they are, not to be moved.
 */
export default function HomeEntry() {
  const { isAuthenticated, loading } = useAuth()
  // `loading` is the token check on a fresh load; until it ends we do not know which of the two this is.
  const [destination, setDestination] = useState(() => (loading ? null : isAuthenticated ? 'library' : 'home'))

  useEffect(() => {
    if (destination === null && !loading) setDestination(isAuthenticated ? 'library' : 'home')
  }, [destination, loading, isAuthenticated])

  if (destination === null) return <PageLoader />
  if (destination === 'library') return <Navigate to="/biblioteca" replace />
  return <HomePage />
}
