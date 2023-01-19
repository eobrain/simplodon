import {
  a,
  aside,
  details,
  em,
  figure,
  figcaption,
  img,
  p,
  section,
  summary,
  strong,
  time
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

/** Create a card object from the JSON returned from the server. */
function makeCard (card) {
  const caption =
    a({ href: card.url }, card.title) +
    (card.description ? p(card.description) : '')
  function html () {
    switch (card.type) {
      case 'link':
      case 'video':
        return aside(
          a(
            { href: card.url, alt: card.title },
            img({ width: card.width, height: card.height, src: card.image }),
            caption
          )
        )
      default:
        return ''
    }
  }
  return Object.freeze({ html })
}

/** Create an attachment object from the JSON returned from the server. */
function makeAttachment (attachment, isSensitive) {
  function _media () {
    if (!attachment.meta.small) {
      return ''
    }
    const { width, height } = attachment.meta.small
    switch (attachment.type) {
      case 'image':
      case 'video':
        return figure(
          a(
            { href: attachment.url },
            img({
              alt: attachment.description,
              src: attachment.preview_url,
              width,
              height
            })
          ) + figcaption(attachment.description)
        )
      default:
        return ''
    }
  }
  function html () {
    const media = _media()
    if (media === '') {
      return ''
    }
    if (!isSensitive) {
      return media
    }
    return details(summary('⚠️🫣 ' + attachment.description), media)
  }

  return Object.freeze({ html })
}

const attachmentListHtml = (as, isSensitive) =>
  as.map((a) => makeAttachment(a, isSensitive).html()).join('')

/** Creates a Status object from the JSON returned from the server. */
function makeStatus (status) {
  const account = makeAccount(status.account)

  function _html () {
    const mediaSection =
      status.media_attachments && status.media_attachments.length > 0
        ? section(
          attachmentListHtml(status.media_attachments, status.sensitive)
        )
        : ''
    const cardHtml = status.card ? makeCard(status.card).html() : ''
    const createdAt = makeDate(status.created_at)
    const contentSection = section(
      cardHtml,
      status.content,
      p(em(createdAt.html()))
    )
    return status.spoiler_text
      ? details(summary(status.spoiler_text), contentSection + mediaSection)
      : contentSection + mediaSection
  }

  function addPrevious (summaryElement) {
    summaryElement.insertAdjacentHTML('afterend', _html())
    if (!account.sameId(status.in_reply_to_account_id)) {
      summaryElement.insertAdjacentHTML('afterend', section(account.html()))
    }
    if (status.in_reply_to_id) {
      _addPrevious(summaryElement, status.in_reply_to_id) // no await, so happens asynchronously
    }
  }

  async function _addPrevious (summaryElement) {
    const inReplyTo = makeStatus(await server.status(status.in_reply_to_id))
    inReplyTo.addPrevious(summaryElement)
  }

  async function thread (articleElement) {
    articleElement.insertAdjacentHTML(
      'beforeend',
      section(account.html()) + _html()
    )
    if (status.in_reply_to_id) {
      const detailsElement = document.createElement('details')
      const summaryElement = document.createElement('summary')
      summaryElement.innerText = '🧵'
      detailsElement.append(summaryElement)
      articleElement.insertAdjacentElement('afterbegin', detailsElement)
      _addPrevious(summaryElement, status.in_reply_to_id) // no await, so happens asynchronously
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
    default: {
      const hashtagMatch = document.location.hash.match(/#tags\/(.+)$/)
      if (hashtagMatch) {
        const hashtag = hashtagMatch[1]
        await showTimeline(`tag/${hashtag}?limit=40`)
        break
      }
    }
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
