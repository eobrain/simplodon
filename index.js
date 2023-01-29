import {
  a,
  aside,
  details,
  div,
  em,
  figure,
  figcaption,
  h3,
  img,
  p,
  section,
  summary,
  sub,
  time
} from 'https://unpkg.com/ez-html-elements'

/* global alert, $settings, $cssLink, $cssSelect, $timeline $login $home, $header, $server */

function settings (shown) {
  if (shown) {
    $timeline.classList.add('hidden')
    $settings.classList.remove('hidden')
  } else {
    $timeline.classList.remove('hidden')
    $settings.classList.add('hidden')
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Singleton object encapsulating interactions with the Mastodon server. */
const server = (() => {
  // server PRIVATE:
  const SERVER_KEY = 'server'
  const ACCESS_TOKEN_KEY = 'access_token'
  const TOKEN_TYPE_KEY = 'token_type'
  const CSS_KEY = 'css_index'
  const headers = {}
  const origin = 'https://allmastodon.com/simplodon/'
  const scope = 'read+write+follow'
  /* eslint-disable camelcase -- because Mastodon API has camelcase JSON fields */
  const client_id = 'S1X3r40DyEN6qX8RjxkoL4uRm6arRqEcoYK2NVrHSf8'
  const client_secret = '6nnyTmudEH6l0iL2nP7ONDoeUUFkgll0N7r7iC3EEzg'
  const redirect_uri = document.location.origin + document.location.pathname
  /* eslint-enable */

  const urlParams = (object) =>
    Object.keys(object)
      .map((k) => `${k}=${object[k]}`)
      .join('&')

  const token = async (code) =>
    await (
      await fetch(`https://${hostname}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams({
          grant_type: 'authorization_code',
          code,
          /* eslint-disable camelcase -- because Mastodon API has camelcase JSON fields */
          client_id,
          client_secret,
          redirect_uri,
          /* eslint-enable */
          scope
        })
      })
    ).json()

  function updateCssTheme () {
    $cssLink.setAttribute('href', $cssSelect.value)
  }

  function update () {
    updateCssTheme()

    $header.innerHTML = hostname || '(no hostname)'
    if (accessToken) {
      $home.classList.add('hidden')
      headers.Authorization = `${tokenType} ${accessToken}`
    } else {
      $home.classList.remove('hidden')
      delete headers.Authorization
    }
  }

  // server CONSTRUCTOR:
  let hostname = window.localStorage.getItem(SERVER_KEY)
  let accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  let tokenType = window.localStorage.getItem(TOKEN_TYPE_KEY)
  $cssSelect.selectedIndex = window.localStorage.getItem(CSS_KEY) || 0
  update()

  // server PUBLIC:
  return Object.freeze({
    /** Has a hostname been defined (from user or from localStorage)? */
    hasHostname: () => !!hostname,

    /** Set hostname as entered by user, and store in localStorage */
    setHostname: (name) => {
      hostname = name
      window.localStorage.setItem(SERVER_KEY, hostname)
      // TODO: update select to correct option (be careful of infinite loop)
      update()
    },

    setCssTheme: () => {
      window.localStorage.setItem(CSS_KEY, $cssSelect.selectedIndex)
      updateCssTheme()
    },

    /** Have we gone through the OAuth flow? */
    isLoggedIn: () => !!accessToken,

    /** Kick off the first step in the OAuth flow by sending the user to the server. */
    setAuthorizeHref: ($anchor) => {
      $anchor.href = `https://${hostname}/oauth/authorize?${urlParams({
        force_login: false,
        scope,
        /* eslint-disable camelcase -- because Mastodon API has camelcase JSON fields */
        client_id,
        redirect_uri,
        /* eslint-enable */
        origin,
        response_type: 'code',
        lang: navigator.language
      })}`
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

    /** Fetch data for an account's list of posts. */
    accountTimeline: async (accountId, querySuffix) =>
      await (
        await fetch(
          `https://${hostname}/api/v1/accounts/${accountId}/statuses?${querySuffix}`,
          {
            headers
          }
        )
      ).json(),

    /** Fetch data for one post. */
    status: async (id) =>
      await (
        await fetch(`https://${hostname}/api/v1/statuses/${id}`, { headers })
      ).json(),

    /** Lookup account information for a user. */
    lookupAccount: async (username) =>
      await (
        await fetch(
          `https://${hostname}/api/v1/accounts/lookup?acct=${username}`,
          { headers }
        )
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

const faviconImg = (host) =>
  img(['inline'], {
    src: `https://${host}/favicon.ico`,
    alt: host
  })

/** Create an account object from the JSON returned from the server. */
function Account (account) {
  // Account PUBLIC:
  return Object.freeze({
    /** Is the given id the same as this account's id? */
    sameId: (id) => id === account.id,

    /** Generate HTML text */
    html: () => {
      const accountServer = account.url.match(/https:\/\/([^/]+)\//)[1]

      return (
        a(
          { href: `#accounts/${account.id}` },
          h3(
            ' @' +
              account.username +
              img(['inline'], {
                src: account.avatar,
                alt: `@${account.username}`
              }) +
              ' ' +
              sub('@' + accountServer + faviconImg(accountServer))
          )
        ) + em(account.display_name)
      )
    }
  })
}

// const accountFromUsername = username => server.

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
    if (!attachment.meta || !attachment.meta.small) {
      return ''
    }
    const { width, height } = attachment.meta.small
    switch (attachment.type) {
      case 'image':
      case 'video':
      case 'gifv':
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
        console.warn(`Unrecognized media attachment type "${attachment.type}"`)
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

  function filterStatus ($status) {
    $status.querySelectorAll('a.hashtag').forEach((a) => {
      a.href = a.href.replace(/^.*\/tags\/(.+)$/, '#tags/$1')
    })
    $status.querySelectorAll('a.u-url').forEach((a) => {
      const parsed = a.href.match(/^https:\/\/(.+)\/@(.+)$/)
      if (parsed) {
        const [, mentionedServer, mentionedPerson] = parsed
        a.innerHTML =
          '@' +
          mentionedPerson +
          sub('@' + mentionedServer + faviconImg(mentionedServer))
      }
    })
  }

  async function fetchAndAddAfter ($summary) {
    const inReplyTo = Status(await server.status(status.in_reply_to_id))
    inReplyTo.addAfter($summary)
  }

  // Status PUBLIC:
  return Object.freeze({
    /** Insert into the given parent element the HTML text for this post and any preceding posts in the thread. */
    thread: async ($parent) => {
      if (status.reblog) {
        $parent.insertAdjacentHTML('beforeend', section(account.html() + '♻️'))
        const $subArticle = document.createElement('article')
        Status(status.reblog).thread($subArticle)
        $parent.append($subArticle)
        return
      }

      $parent.insertAdjacentHTML('beforeend', section(account.html()) + html())
      filterStatus($parent.lastElementChild)
      if (status.in_reply_to_id) {
        const $details = document.createElement('details')
        const $summary = document.createElement('summary')
        $summary.innerText = '🧵'
        $details.append($summary)
        $parent.insertAdjacentElement('afterbegin', $details)
        fetchAndAddAfter($summary, status.in_reply_to_id) // no await, so happens asynchronously
      }
    },

    /** Insert after the given sibling element the HTML for this post. */
    addAfter: ($sibling) => {
      $sibling.insertAdjacentHTML('afterend', html())
      filterStatus($sibling.nextElementSibling)
      if (!account.sameId(status.in_reply_to_account_id)) {
        $sibling.insertAdjacentHTML('afterend', section(account.html()))
      }
      if (status.in_reply_to_id) {
        fetchAndAddAfter($sibling, status.in_reply_to_id) // no await, so happens asynchronously
      }
    }
  })
}

async function showStatusList (header, statuses) {
  if (statuses.error) {
    alert(statuses.error)
    return
  }
  $header.innerHTML = header
  $timeline.replaceChildren()
  for (const statusJson of statuses) {
    const status = Status(statusJson)
    const $article = document.createElement('article')
    $timeline.append($article)
    await status.thread($article)
  }
}

async function showTimeline (header, querySuffix) {
  await showStatusList(header, await server.timeline(querySuffix))
}

async function showAccountTimeline (accountId, querySuffix) {
  await showStatusList(
    '🧑',
    await server.accountTimeline(accountId, querySuffix)
  )
}

async function hasServer () {
  server.setAuthorizeHref($login)
  $login.classList.remove('hidden')
  settings(true)
  if (!document.location.hash || document.location.hash === '#') {
    document.location.hash = server.isLoggedIn ? '#home' : '#public'
  } else {
    app()
  }
  settings(false)
}

async function noServer () {
  $login.classList.add('hidden')
  settings(true)
  $header.innerHTML = ''
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
      await showTimeline('🏠', 'home?limit=40')
      break
    case '#public':
      await showTimeline('🌐', 'public?limit=40')
      break
    case '#public/local':
      await showTimeline('🧑🏽‍🤝‍🧑🏽', 'public?limit=40&local=true')
      break
    case '#changeserver':
      server.removeHostname()
      noServer()
      document.location.hash = ''
      break
    case '#settings':
      settings(true)
      break
    default: {
      const hashtagMatch = document.location.hash.match(/#tags\/(.+)$/)
      if (hashtagMatch) {
        const hashtag = hashtagMatch[1]
        await showTimeline(`#${hashtag}`, `tag/${hashtag}?limit=40`)
        break
      }
      const accountMatch = document.location.hash.match(/#accounts\/(.+)$/)
      if (accountMatch) {
        const accountId = accountMatch[1]
        await showAccountTimeline(accountId, 'limit=40')
        break
      }
      console.warn(`Unexpected hash ${document.location.hash}`)
    }
  }
}

window.onhashchange = app

if (server.hasHostname()) {
  hasServer()
} else {
  noServer()
}

$server.addEventListener('keyup', async (event) => {
  if (event.key === 'Enter') {
    const hostname = $server.value.trim()
    if (hostname && hostname.match(/[a-z]+\.[a-z]+/)) {
      server.setHostname(hostname)
      await hasServer()
    }
  }
})

$cssSelect.addEventListener('change', (event) => {
  server.setCssTheme()
  settings(false)
})

app()
