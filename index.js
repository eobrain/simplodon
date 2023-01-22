import {
  a,
  aside,
  details,
  div,
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

/* global alert, timelineElement loginElement homeElement, noServerElement headerElement serverElement */

const DAY_MS = 24 * 60 * 60 * 1000

/** Singleton object encapsulating interactions with the Mastodon server. */
const server = (() => {
  const SERVER_KEY = 'server'
  const ACCESS_TOKEN_KEY = 'access_token'
  const TOKEN_TYPE_KEY = 'token_type'

  let hostname = window.localStorage.getItem(SERVER_KEY)
  let access_token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  let token_type = window.localStorage.getItem(TOKEN_TYPE_KEY)

  const headers = {}

  _update()

  const hasHostname = () => !!hostname
  const isLoggedIn = () => !!access_token

  function setHostname (name) {
    hostname = name
    window.localStorage.setItem(SERVER_KEY, hostname)
    _update()
  }

  async function login (code) {
    ({ access_token, token_type } = await _token())
    window.localStorage.setItem(ACCESS_TOKEN_KEY, access_token)
    window.localStorage.setItem(TOKEN_TYPE_KEY, token_type)

    _update()
  }

  function removeHostname () {
    hostname = null
    window.localStorage.removeItem(SERVER_KEY)
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(TOKEN_TYPE_KEY)
    _update()
  }

  const CLIENT_ID = 'S1X3r40DyEN6qX8RjxkoL4uRm6arRqEcoYK2NVrHSf8'
  // const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'
  const REDIRECT_URI = 'http://localhost:8000/'
  // const REDIRECT_URI='https://allmastodon.com/simplodon/' // TODO make dynamic

  const SCOPE = 'read+write+follow'

  function setAuthorizeHref (anchorElement) {
    const paramsMap = {
      client_id: CLIENT_ID,
      force_login: false,
      scope: SCOPE,
      redirect_uri: REDIRECT_URI,
      origin: 'https://allmastodon.com/simplodon/',
      response_type: 'code',
      lang: 'en-US' // TODO use browser locale
    }
    const params = Object.keys(paramsMap)
      .map((k) => `${k}=${paramsMap[k]}`)
      .join('&')
    anchorElement.href = `https://${hostname}/oauth/authorize?${params}`
  }

  function _update () {
    headerElement.innerHTML = hostname || '(no hostname)'
    if (access_token) {
      homeElement.classList.add('hidden')
      headers.Authorization = `${token_type} ${access_token}`
    } else {
      homeElement.classList.remove('hidden')
      delete headers.Authorization
    }
  }

  const timeline = async (querySuffix) =>
    await (
      await fetch(`https://${hostname}/api/v1/timelines/${querySuffix}`, {
        headers
      })
    ).json()

  const status = async (id) =>
    await (
      await fetch(`https://${hostname}/api/v1/statuses/${id}`, { headers })
    ).json()

  const CLIENT_KEY = 'S1X3r40DyEN6qX8RjxkoL4uRm6arRqEcoYK2NVrHSf8'
  const CLIENT_SECRET = '6nnyTmudEH6l0iL2nP7ONDoeUUFkgll0N7r7iC3EEzg'

  const _token = async (code) =>
    await (
      await fetch(`https://${hostname}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${code}&client_id=${CLIENT_KEY}&client_secret=${CLIENT_SECRET}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=${SCOPE}`
      })
    ).json()

  return Object.freeze({
    hasHostname,
    setHostname,
    isLoggedIn,
    login,
    removeHostname,
    setAuthorizeHref,
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
      : div(contentSection + mediaSection)
  }

  function filterStatus (statusElement) {
    statusElement.querySelectorAll('a.hashtag').forEach((a) => {
      a.href = a.href.replace(/^.*\/tags\/(.+)$/, '#tags/$1')
    })
  }

  function addPrevious (summaryElement) {
    summaryElement.insertAdjacentHTML('afterend', _html())
    filterStatus(summaryElement.nextElementSibling)
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
    filterStatus(articleElement.lastElementChild)
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
  if (statuses.error) {
    alert(statuses.error)
    return
  }
  timelineElement.replaceChildren()
  for (const statusJson of statuses) {
    const status = makeStatus(statusJson)
    const articleElement = document.createElement('article')
    timelineElement.append(articleElement)
    await status.thread(articleElement)
  }
}

async function hasServer () {
  server.setAuthorizeHref(loginElement)
  loginElement.classList.remove('hidden')
  noServerElement.classList.add('hidden')
  if (!document.location.hash || document.location.hash === '#') {
    document.location.hash = server.isLoggedIn ? '#home' : '#public'
  } else {
    app()
  }
}

async function noServer () {
  loginElement.classList.add('hidden')
  noServerElement.classList.remove('hidden')
}

async function app () {
  const codeMatch = document.location.search.match(/code=(.+)$/)
  if (codeMatch) {
    await server.login(codeMatch[1])
    document.location.search = ''
    document.location.hash = '#home'
    return
  }
  switch (document.location.hash) {
    case '#home':
      await showTimeline('home?limit=40')
      break
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
