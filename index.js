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

class Account {
  constructor (json) {
    Object.assign(this, json)
  }

  html () {
    const server = this.url.match(/https:\/\/([^/]+)\//)[1]

    return p(
      img({ src: this.avatar, alt: `avatar of ${this.username}` }) +
        img({
          src: `https://${server}/favicon.ico`,
          alt: `avatar of ${server}`
        }) +
        strong(' @' + this.username + '@' + server) +
        ' ' +
        em(this.displayName)
    )
  }

  sameId (id) {
    return id === this.id
  }
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

class Status {
  constructor (json) {
    Object.assign(this, json)
  }

  html () {
    const mediaSection =
      this.media_attachments && this.media_attachments.length > 0
        ? section(attachementListHtml(this.media_attachments))
        : ''
    const contentSection = section(
      this.content,
      p(em(dateHtml(this.created_at)))
    )
    const account = new Account(this.account)
    const accountSection = account.sameId(this.in_reply_to_account_id)
      ? ''
      : section(account.html())
    const maybeHidden = this.spoiler_text
      ? details(summary(this.spoiler_text), contentSection + mediaSection)
      : contentSection + mediaSection
    return accountSection + maybeHidden
  }

  /** Recursive */
  async chain () {
    if (!this.in_reply_to_id) {
      return this.html()
    }
    try {
      const response = await fetch(
        `https://${server}/api/v1/statuses/${this.in_reply_to_id}`
      )
      const inReplyTo = await response.json()
      return (await this.chain(inReplyTo)) + this.html()
    } catch {
      return this.html()
    }
  }
}

async function showTimeline (querySuffix) {
  const response = await fetch(
    `https://${server}/api/v1/timelines/${querySuffix}`
  )
  const statuses = await response.json()
  timelineElement.replaceChildren()
  for (const statusJson of statuses) {
    const status = new Status(statusJson)
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
