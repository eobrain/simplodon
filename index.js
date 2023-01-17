import {
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

const DAY_MS = 24 * 60 * 60 * 1000

/** Singleton object encapsulating interactions with the Mastodon server. */
const server = (() => {
  const KEY = 'server'
  let hostname = window.localStorage.getItem(KEY)
  _updateDom()

  const hasHostname = () => !!hostname

  function setHostname (name) {
    hostname = name
    window.localStorage.setItem(KEY, hostname)
    _updateDom()
  }

  function removeHostname () {
    hostname = null
    window.localStorage.removeItem(KEY)
    _updateDom()
  }

  function _updateDom () {
    headerElement.innerHTML = hostname || '(no hostname)'
  }

  const timeline = async (querySuffix) =>
    await (
      await fetch(`https://${hostname}/api/v1/timelines/${querySuffix}`)
    ).json()

  const status = async (id) =>
    await (await fetch(`https://${hostname}/api/v1/statuses/${id}`)).json()

  return Object.freeze({
    hasHostname,
    setHostname,
    removeHostname,
    timeline,
    status
  })
})()

/** Create a date object from a standard string representation */
function makeDate (dateString) {
  function _localeString (dateString) {
    const dateMs = Date.parse(dateString)
    const date = new Date()
    date.setTime(dateMs)
    return dateMs > Date.now() - DAY_MS
      ? date.toLocaleTimeString()
      : date.toLocaleDateString()
  }

  const html = () =>
    p(time({ datetime: dateString }, _localeString(dateString)))

  return Object.freeze({ html })
}

/** Create an account object from the JSON returned from the server. */
function makeAccount (account) {
  function html () {
    const accountServer = account.url.match(/https:\/\/([^/]+)\//)[1]

    return p(
      img({ src: account.avatar, alt: `avatar of ${account.username}` }) +
        img({
          src: `https://${accountServer}/favicon.ico`,
          alt: `avatar of ${accountServer}`
        }) +
        strong(' @' + account.username + '@' + accountServer) +
        ' ' +
        em(account.display_name)
    )
  }

  const sameId = (id) => id === account.id

  return Object.freeze({ html, sameId })
}

/** Create an attachement object from the JSON returned from the server. */
function makeAttachement (attachment) {
  function html () {
    if (!attachment.meta.small) {
      return ''
    }
    const { width, height } = attachment.meta.small
    switch (attachment.type) {
      case 'image':
        return figure(
          img({
            alt: attachment.description,
            src: attachment.preview_url,
            width,
            height
          }) + figcaption(attachment.description)
        )
      case 'video':
        return figure(
          video({
            controls: true,
            src: attachment.preview_url,
            width,
            height
          }) + figcaption(attachment.description)
        )
    }
  }
  return Object.freeze({ html })
}

const attachmentListHtml = (as) =>
  as.map((a) => makeAttachement(a).html()).join('')

/** Creates a Status object from the JSON returned from the server. */
function makeStatus (status) {
  function _html () {
    const mediaSection =
      status.media_attachments && status.media_attachments.length > 0
        ? section(attachmentListHtml(status.media_attachments))
        : ''
    const createdAt = makeDate(status.created_at)
    const contentSection = section(status.content, p(em(createdAt.html())))
    const account = makeAccount(status.account)
    const accountSection = account.sameId(status.in_reply_to_account_id)
      ? ''
      : section(account.html())
    const maybeHidden = status.spoiler_text
      ? details(summary(status.spoiler_text), contentSection + mediaSection)
      : contentSection + mediaSection
    return accountSection + maybeHidden
  }

  async function addPrevious (detailsElement) {
    detailsElement.insertAdjacentHTML('afterbegin', _html())
    if (status.in_reply_to_id) {
      _addPrevious(detailsElement, status.in_reply_to_id) // no await, so happens asynchronously
    }
  }

  async function _addPrevious (detailsElement) {
    const inReplyTo = makeStatus(await server.status(status.in_reply_to_id))
    await inReplyTo.addPrevious(detailsElement)
  }

  async function thread (articleElement) {
    articleElement.insertAdjacentHTML('beforeend', _html())
    if (status.in_reply_to_id) {
      const detailsElement = document.createElement('details')
      const summaryElement = document.createElement('summary')
      summaryElement.innerText = '🧵'
      detailsElement.append(summaryElement)
      articleElement.insertAdjacentElement('afterbegin', detailsElement)
      _addPrevious(detailsElement, status.in_reply_to_id) // no await, so happens asynchronously
    }
  }
  return Object.freeze({ thread, addPrevious })
}

async function showTimeline (querySuffix) {
  const statuses = await server.timeline(querySuffix)
  timelineElement.replaceChildren()
  for (const statusJson of statuses) {
    const status = makeStatus(statusJson)
    const articleElement = document.createElement('article')
    timelineElement.append(articleElement)
    await status.thread(articleElement)
  }
}

async function hasServer () {
  noServerElement.classList.add('hidden')
  if (!document.location.hash || document.location.hash === '#') {
    document.location.hash = '#public'
  } else {
    app()
  }
}

async function noServer () {
  noServerElement.classList.remove('hidden')
}

async function app () {
  switch (document.location.hash) {
    case '#public':
      await showTimeline('public?limit=40')
      break
    case '#public/local':
      await showTimeline('public?limit=40&local=true')
      break
    case '#changeserver':
      server.removeHostname()
      noServer()
      document.location.hash = ''
      break
  }
}

window.onhashchange = app

if (server.hasHostname()) {
  hasServer()
} else {
  noServer()
}

serverElement.addEventListener('keyup', async (event) => {
  if (event.key === 'Enter') {
    const hostname = serverElement.value.trim()
    if (hostname && hostname.match(/[a-z]+\.[a-z]+/)) {
      server.setHostname(hostname)
      await hasServer()
    }
  }
})
