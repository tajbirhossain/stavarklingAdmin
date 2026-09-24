'use client'

export default function ErrorBanner({
  title = 'Something went wrong',
  message,
}: {
  title?: string
  message: string
}) {
  return (
    <div className="error-banner" role="alert">
      <p className="error-banner-title">{title}</p>
      <p className="error-banner-text">{message}</p>
    </div>
  )
}
