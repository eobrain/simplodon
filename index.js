import {
  article,
  details,
  em,
  figure,
  figcaption,
  img,
  p,
  section,
  summary,
  strong,
  time,
  video
} from 'https://unpkg.com/ez-html-elements'

/* global timelineElement noServerElement headerElement serverElement */

const SERVER_KEY = 'server'
let server = window.localStorage.getItem(SERVER_KEY)
const DAY_MS = 24 * 60 * 60 * 1000

function dateView (dateString) {
  const dateMs = Date.parse(dateString)
  const date = new Date()
  date.setTime(dateMs)
  return dateMs > Date.now() - DAY_MS
    ? date.toLocaleTimeString()
    : date.toLocaleDateString()
}

const dateHtml = (dateString) =>
  p(time({ datetime: dateString }, dateView(dateString)))

function makeAccount (account) {
  function html () {
    const server = account.url.match(/https:\/\/([^/]+)\//)[1]

    return p(
      img({ src: account.avatar, alt: `avatar of ${account.username}` }) +
        img({
          src: `https://${server}/favicon.ico`,
          alt: `avatar of ${server}`
        }) +
        strong(' @' + account.username + '@' + server) +
        ' ' +
        em(account.display_name)
    )
  }

  const sameId = (id) => id === account.id

  return Object.freeze({ html, sameId })
}

function attachementHtml (attachement) {
  const { type, preview_url: previewUrl, meta, description } = attachement
  if (!meta.small) {
    return ''
  }
  const { width, height } = meta.small
  switch (type) {
    case 'image':
      return figure(
        img({ alt: description, src: previewUrl, width, height }) +
          figcaption(description)
      )
    case 'video':
      return figure(
        video({ controls: true, src: previewUrl, width, height }) +
          figcaption(description)
      )
  }
}

const attachementListHtml = (as) => as.map(attachementHtml).join('')

function makeStatus (status) {
  function html () {
    const mediaSection =
      status.media_attachments && status.media_attachments.length > 0
        ? section(attachementListHtml(status.media_attachments))
        : ''
    const contentSection = section(
      status.content,
      p(em(dateHtml(status.created_at)))
    )
    const account = makeAccount(status.account)
    const accountSection = account.sameId(status.in_reply_to_account_id)
      ? ''
      : section(account.html())
    const maybeHidden = status.spoiler_text
      ? details(summary(status.spoiler_text), contentSection + mediaSection)
      : contentSection + mediaSection
    return accountSection + maybeHidden
  }

  /** Recursive */
  async function chain () {
    if (!status.in_reply_to_id) {
      return html()
    }
    try {
      const response = await fetch(
        `https://${server}/api/v1/statuses/${status.in_reply_to_id}`
      )
      const inReplyTo = await response.json()
      return (await chain(inReplyTo)) + html()
    } catch {
      return html()
    }
  }
  return Object.freeze({ chain })
}

async function showTimeline (querySuffix) {
  const response = await fetch(
    `https://${server}/api/v1/timelines/${querySuffix}`
  )
  const statuses = await response.json()
  timelineElement.replaceChildren()
  for (const statusJson of statuses) {
    const status = makeStatus(statusJson)
    timelineElement.insertAdjacentHTML(
      'beforeend',
      article(await status.chain())
    )
  }
}

async function hasServer () {
  noServerElement.classList.add('hidden')
  headerElement.innerHTML = server
  if (!document.location.hash) {
    document.location.hash = '#public'
  } else {
    app()
  }
}

async function app () {
  switch (document.location.hash) {
    case '#public':
      await showTimeline('public?limit=40')
      break
    case '#public/local':
      await showTimeline('public?limit=40&local=true')
      break
  }
}

window.onhashchange = app

if (server) {
  hasServer()
} else {
  noServerElement.classList.remove('hidden')
  serverElement.addEventListener('keyup', async (event) => {
    if (event.key === 'Enter') {
      server = serverElement.value.trim()
      if (server && server.match(/[a-z]+\.[a-z]+/)) {
        window.localStorage.setItem(SERVER_KEY, server)
        await hasServer()
      }
    }
  })
}
