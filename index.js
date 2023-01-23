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
  // server PRIVATE:
  const SERVER_KEY = 'server'
  const ACCESS_TOKEN_KEY = 'access_token'
  const TOKEN_TYPE_KEY = 'token_type'
  const headers = {}
  const origin = 'https://allmastodon.com/simplodon/'
  const CLIENT_ID = 'S1X3r40DyEN6qX8RjxkoL4uRm6arRqEcoYK2NVrHSf8'
  // const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'
  const REDIRECT_URI = 'http://localhost:8000/'
  // const REDIRECT_URI='https://allmastodon.com/simplodon/' // TODO make dynamic

  const scope = 'read+write+follow'
  const CLIENT_KEY = 'S1X3r40DyEN6qX8RjxkoL4uRm6arRqEcoYK2NVrHSf8'
  const CLIENT_SECRET = '6nnyTmudEH6l0iL2nP7ONDoeUUFkgll0N7r7iC3EEzg'

  const token = async (code) =>
    await (
      await fetch(`https://${hostname}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${code}&client_id=${CLIENT_KEY}&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URI}&scope=${scope}`
      })
    ).json()

  function update () {
    headerElement.innerHTML = hostname || '(no hostname)'
    if (accessToken) {
      homeElement.classList.add('hidden')
      headers.Authorization = `${tokenType} ${accessToken}`
    } else {
      homeElement.classList.remove('hidden')
      delete headers.Authorization
    }
  }

  // server CONSTRUCTOR:
  let hostname = window.localStorage.getItem(SERVER_KEY)
  let accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  let tokenType = window.localStorage.getItem(TOKEN_TYPE_KEY)
  update()

  // server PUBLIC:
  return Object.freeze({
    /** Has a hostname been defined (from user or from localStorage)? */
    hasHostname: () => !!hostname,

    /** Set hostname as entered by user, and store in localStorage */
    setHostname: (name) => {
      hostname = name
      window.localStorage.setItem(SERVER_KEY, hostname)
      update()
    },

    /** Have we gone through the OAuth flow? */
    isLoggedIn: () => !!accessToken,

    /** Kick off the first step in the OAuth flow by sending the user to the server. */
    setAuthorizeHref: (anchorElement) => {
      const paramsMap = {
        client_id: CLIENT_ID,
        force_login: false,
        scope,
        redirect_uri: REDIRECT_URI,
        origin,
        response_type: 'code',
        lang: 'en-US' // TODO use browser locale
      }
      const params = Object.keys(paramsMap)
        .map((k) => `${k}=${paramsMap[k]}`)
        .join('&')
      anchorElement.href = `https://${hostname}/oauth/authorize?${params}`
    },

    /** Execute the second step of the OAuth flow after receiving the code from the server */
    login: async (code) => {
      ({ access_token: accessToken, token_type: tokenType } = await token(
        code
      ))
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      window.localStorage.setItem(TOKEN_TYPE_KEY, tokenType)

      update()
    },

    /** Logout and disconnect from the server (deleting everything from localstorage) */
    removeHostname: () => {
      hostname = null
      accessToken = null
      window.localStorage.removeItem(SERVER_KEY)
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
      window.localStorage.removeItem(TOKEN_TYPE_KEY)
      update()
    },

    /** Fetch data for a list of posts. */
    timeline: async (querySuffix) =>
      await (
        await fetch(`https://${hostname}/api/v1/timelines/${querySuffix}`, {
          headers
        })
      ).json(),

    /** Fetch data for one post. */
    status: async (id) =>
      await (
        await fetch(`https://${hostname}/api/v1/statuses/${id}`, { headers })
      ).json()
  })
})()

/** Create a date object from a standard string representation */
function HtmlDate (dateString) {
  // HtmlDate PRIVATE:
  function localeString (dateString) {
    const dateMs = Date.parse(dateString)
    const date = new Date()
    date.setTime(dateMs)
    return dateMs > Date.now() - DAY_MS
      ? date.toLocaleTimeString()
      : date.toLocaleDateString()
  }

  // HtmlDate PUBLIC:
  return Object.freeze({
    /** Generate HTML text */
    html: () => p(time({ datetime: dateString }, localeString(dateString)))
  })
}

/** Create an account object from the JSON returned from the server. */
function Account (account) {
  // Account PUBLIC:
  return Object.freeze({
    /** Is the given id the same as this account's id? */
    sameId: (id) => id === account.id,

    /** Generate HTML text */
    html: () => {
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
  })
}

/** Create a card object from the JSON returned from the server. */
function Card (card) {
  // Card PRIVATE:
  const caption =
    a({ href: card.url }, card.title) +
    (card.description ? p(card.description) : '')

  // Card PUBLIC:
  return Object.freeze({
    /** Generate HTML text */
    html: () => {
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
  })
}

/** Create an attachment object from the JSON returned from the server. */
function Attachment (attachment, isSensitive) {
  // Attachment PRIVATE:
  /** Generate HTML for the media item */
  function mediaHtml () {
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

  // Attachment PUBLIC:
  return Object.freeze({
    /** Generate HTML text */
    html: () => {
      const media = mediaHtml()
      if (media === '') {
        return ''
      }
      if (!isSensitive) {
        return media
      }
      return details(summary('⚠️🫣 ' + attachment.description), media)
    }
  })
}

const attachmentListHtml = (as, isSensitive) =>
  as.map((a) => Attachment(a, isSensitive).html()).join('')

/** Creates a Status object from the JSON returned from the server. */
function Status (status) {
  // Status PRIVATE:
  const account = Account(status.account)

  function html () {
    const mediaSection =
      status.media_attachments && status.media_attachments.length > 0
        ? section(
          attachmentListHtml(status.media_attachments, status.sensitive)
        )
        : ''
    const cardHtml = status.card ? Card(status.card).html() : ''
    const createdAt = HtmlDate(status.created_at)
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

  async function fetchAndAddAfter (summaryElement) {
    const inReplyTo = Status(await server.status(status.in_reply_to_id))
    inReplyTo.addAfter(summaryElement)
  }

  // Status PUBLIC:
  return Object.freeze({
    /** Insert into the given parent element the HTML text for this post and any preceding posts in the thread. */
    thread: async (parentElement) => {
      parentElement.insertAdjacentHTML(
        'beforeend',
        section(account.html()) + html()
      )
      filterStatus(parentElement.lastElementChild)
      if (status.in_reply_to_id) {
        const detailsElement = document.createElement('details')
        const summaryElement = document.createElement('summary')
        summaryElement.innerText = '🧵'
        detailsElement.append(summaryElement)
        parentElement.insertAdjacentElement('afterbegin', detailsElement)
        fetchAndAddAfter(summaryElement, status.in_reply_to_id) // no await, so happens asynchronously
      }
    },

    /** Insert after the given sibling element the HTML for this post. */
    addAfter: (siblingElement) => {
      siblingElement.insertAdjacentHTML('afterend', html())
      filterStatus(siblingElement.nextElementSibling)
      if (!account.sameId(status.in_reply_to_account_id)) {
        siblingElement.insertAdjacentHTML('afterend', section(account.html()))
      }
      if (status.in_reply_to_id) {
        fetchAndAddAfter(siblingElement, status.in_reply_to_id) // no await, so happens asynchronously
      }
    }
  })
}

async function showTimeline (querySuffix) {
  const statuses = await server.timeline(querySuffix)
  if (statuses.error) {
    alert(statuses.error)
    return
  }
  timelineElement.replaceChildren()
  for (const statusJson of statuses) {
    const status = Status(statusJson)
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
