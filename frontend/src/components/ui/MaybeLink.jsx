import { Link } from 'react-router-dom'

/**
 * A `<Link>` that degrades to an inert `<span>` when `to` is null - the case whenever a card's
 * `area` didn't come back from the API (see `lib/contentLinks.js`). Keeps a mismatched-deploy
 * response from crashing the page: the card just stops being clickable instead.
 */
export function MaybeLink({ to, children, ...props }) {
  if (!to) {
    return (
      <span {...props} aria-disabled="true">
        {children}
      </span>
    )
  }
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  )
}
