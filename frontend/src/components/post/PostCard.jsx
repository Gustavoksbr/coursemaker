import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ContentBadges } from '@/components/ui/Badge'
import { LikeButton } from '@/components/ui/LikeButton'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { likePost, unlikePost } from '@/api/posts'
import { formatRelative } from '@/lib/format'

export function PostCard({ post, onLikeChange }) {
  const href = `/posts/${post.owner.nickname}/${post.slug}`

  return (
    <article className="card group flex flex-col overflow-hidden">
      <Link to={href} className="block" tabIndex={-1} aria-hidden="true">
        <Thumbnail src={post.thumbnailUrl} alt={post.title} />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <ContentBadges status={post.status} visibility={post.visibility} featured={post.featured} />

        <div className="flex-1">
          <h3 className="line-clamp-2 break-words font-bold leading-snug text-slate-100 group-hover:text-brand-400">
            <Link to={href}>{post.title}</Link>
          </h3>
          {post.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{post.description}</p>
          )}
        </div>

        {post.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.categories.slice(0, 3).map((category) => (
              <span key={category} className="badge max-w-full break-all bg-slate-700/60 text-slate-300">
                {category}
              </span>
            ))}
          </div>
        )}

        <Link
          to={`/users/${post.owner.nickname}`}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200"
        >
          <Avatar src={post.owner.image} name={post.owner.name} size="sm" />
          <span className="truncate">{post.owner.name}</span>
        </Link>

        <div className="flex items-center justify-between border-t border-slate-700/70 pt-3 text-xs text-slate-400">
          <time dateTime={post.createdAt}>{formatRelative(post.createdAt)}</time>
          <LikeButton
            liked={post.likedByMe}
            count={post.likeCount}
            size="sm"
            onLike={() => likePost(post.id)}
            onUnlike={() => unlikePost(post.id)}
            onChange={onLikeChange}
          />
        </div>
      </div>
    </article>
  )
}
