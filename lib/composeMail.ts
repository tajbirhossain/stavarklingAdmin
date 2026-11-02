/** Build /messages?compose=1&… links for prefilled compose. */

export function composeMailHref(options: {
  to: string
  name?: string
  subject?: string
  body?: string
}) {
  const to = options.to.trim()
  const params = new URLSearchParams()
  params.set('compose', '1')
  if (to) params.set('to', to)
  if (options.name?.trim()) params.set('name', options.name.trim())
  if (options.subject?.trim()) params.set('subject', options.subject.trim())
  if (options.body != null && options.body !== '') {
    params.set('body', options.body)
  }
  return `/messages?${params.toString()}`
}

export function applicantComposeHref(email: string, fullName?: string) {
  const name = fullName?.trim() || ''
  return composeMailHref({
    to: email,
    name,
    subject: name
      ? `Stavarkling — a note for ${name}`
      : 'Stavarkling — a quick note',
    body: name ? `Hello ${name},\n\n` : 'Hello,\n\n',
  })
}
