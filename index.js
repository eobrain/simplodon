import {
  article,
  figure,
  figcaption,
  img,
  p,
  section,
  span,
  time,
  video
} from 'https://unpkg.com/ez-html-elements'

/* global timelineElement noServerElement headerElement serverElement */

const SERVER_KEY = 'server'
let server = window.localStorage.getItem(SERVER_KEY)

function dateView (dateString) {
  const ms = Date.now() - Date.parse(dateString)
  if (ms < 1500) {
    return `${ms} ms`
  }
  const seconds = Math.round(ms / 1000)
  if (seconds < 90) {
    return `${seconds} seconds`
  }
  const minutes = Math.round(seconds / 60)
  if (minutes < 90) {
    return `${minutes} minutes`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 90) {
    return `${hours} hours`
  }
  const days = Math.round(hours / 24)
  return `${days} days`
}

const dateHtml = (dateString) =>
  time({ datetime: dateString }, dateView(dateString) + ' ago')

function accountHtml (account) {
  const {
    avatar,
    username,
    url,
    display_name: displayName,
    followers_count: followersCount
  } = account
  const accountServer = url.match(/https:\/\/([^/]+)\//)[1]
  const avatarSize = Math.sqrt(followersCount)

  return (
    img({ src: avatar, width: avatarSize, height: avatarSize }) +
    span(
      ' @' +
        username +
        img({ src: `https://${accountServer}/favicon.ico` }, ['favicon'])
    ) +
    displayName
  )
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

function statusHtml (status) {
  const {
    created_at: createdAt,
    content,
    account,
    media_attachments: attachments,
    in_reply_to_account_id: inReplyToAccountId
  } = status
  const mediaSection =
    attachments && attachments.length > 0
      ? section(attachementListHtml(attachments))
      : ''
  const contentSection = section(p(dateHtml(createdAt)), p(content))
  const accountSection =
    inReplyToAccountId === account.id
      ? ''
      : section(['metadata'], accountHtml(account))
  return accountSection + contentSection + mediaSection
}

/** Recursive */
async function statusChain (status) {
  const { in_reply_to_id: inReplyToId } = status
  if (!inReplyToId) {
    return statusHtml(status)
  }
  try {
    const response = await fetch(
      `https://${server}/api/v1/statuses/${inReplyToId}`
    )
    const inReplyTo = await response.json()
    return (await statusChain(inReplyTo)) + '🧵' + statusHtml(status)
  } catch {
    return statusHtml(status)
  }
}

async function showTimeline (querySuffix) {
  const response = await fetch(
    `https://${server}/api/v1/timelines/${querySuffix}`
  )
  const statuses = await response.json()
  timelineElement.replaceChildren()
  for (const status of statuses) {
    timelineElement.insertAdjacentHTML(
      'beforeend',
      article(await statusChain(status))
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
