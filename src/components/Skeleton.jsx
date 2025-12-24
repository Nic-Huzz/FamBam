import './Skeleton.css'

export function SkeletonPost() {
  return (
    <div className="skeleton-post">
      <div className="skeleton-header">
        <div className="skeleton skeleton-avatar"></div>
        <div className="skeleton-meta">
          <div className="skeleton skeleton-name"></div>
          <div className="skeleton skeleton-time"></div>
        </div>
      </div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
      <div className="skeleton skeleton-image"></div>
      <div className="skeleton-actions">
        <div className="skeleton skeleton-action"></div>
        <div className="skeleton skeleton-action"></div>
      </div>
    </div>
  )
}

export function SkeletonChallenge() {
  return (
    <div className="skeleton-challenge">
      <div className="skeleton skeleton-icon"></div>
      <div className="skeleton-content">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-desc"></div>
      </div>
      <div className="skeleton skeleton-points"></div>
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="skeleton-stat">
      <div className="skeleton skeleton-stat-value"></div>
      <div className="skeleton skeleton-stat-label"></div>
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div className="feed-skeleton">
      <SkeletonPost />
      <SkeletonPost />
      <SkeletonPost />
    </div>
  )
}

export function ChallengeSkeleton() {
  return (
    <div className="challenge-skeleton">
      <SkeletonChallenge />
      <SkeletonChallenge />
      <SkeletonChallenge />
      <SkeletonChallenge />
    </div>
  )
}
