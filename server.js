/* global $cssSelect $cssLink $header $login $home $server */

/** Singleton object encapsulating interactions with the Mastodon server. */
export default (() => {
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
      await fetch(`https://${$server.value}/oauth/token`, {
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

  const isLoggedIn = () => !!accessToken

  const updateNavButtons = () => {
    if (isLoggedIn()) {
      // When logged in show $home
      $home.classList.remove('hidden')
      $login.classList.add('hidden')
    } else {
      // When not logged in show $login
      $home.classList.add('hidden')
      $login.classList.remove('hidden')
    }
  }

  function update () {
    updateCssTheme()

    $header.innerHTML = $server.value || '(no hostname)'
    if (accessToken) {
      headers.Authorization = `${tokenType} ${accessToken}`
    } else {
      delete headers.Authorization
    }
    updateNavButtons()
  }

  // server CONSTRUCTOR:
  $server.value = window.localStorage.getItem(SERVER_KEY)
  let accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  let tokenType = window.localStorage.getItem(TOKEN_TYPE_KEY)
  $cssSelect.selectedIndex = window.localStorage.getItem(CSS_KEY) || 0
  update()

  // server PUBLIC:
  return Object.freeze({
    /** Has a hostname been defined (from user or from localStorage)? */
    hasHostname: () => !!$server.value,

    /** Set hostname as entered by user, and store in localStorage */
    setHostname: (name) => {
      $server.value = name
      window.localStorage.setItem(SERVER_KEY, $server.value)
      // TODO: update select to correct option (be careful of infinite loop)
      update()
    },

    setCssTheme: () => {
      window.localStorage.setItem(CSS_KEY, $cssSelect.selectedIndex)
      updateCssTheme()
    },

    /** Have we gone through the OAuth flow? */
    isLoggedIn,

    /** Kick off the first step in the OAuth flow by sending the user to the server. */
    setAuthorizeHref: ($anchor) => {
      $anchor.href = `https://${$server.value}/oauth/authorize?${urlParams({
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
      $server.value = null
      accessToken = null
      window.localStorage.removeItem(SERVER_KEY)
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
      window.localStorage.removeItem(TOKEN_TYPE_KEY)
      update()
    },

    /** Fetch data for a list of posts. */
    timeline: async (querySuffix) =>
      await (
        await fetch(
          `https://${$server.value}/api/v1/timelines/${querySuffix}`,
          {
            headers
          }
        )
      ).json(),

    /** Fetch data for an account's list of posts. */
    accountTimeline: async (accountId, querySuffix) =>
      await (
        await fetch(
          `https://${$server.value}/api/v1/accounts/${accountId}/statuses?${querySuffix}`,
          {
            headers
          }
        )
      ).json(),

    /** Fetch data for one post. */
    status: async (id) =>
      await (
        await fetch(`https://${$server.value}/api/v1/statuses/${id}`, {
          headers
        })
      ).json(),

    /** Lookup account information for a user. */
    lookupAccount: async (username) =>
      await (
        await fetch(
          `https://${$server.value}/api/v1/accounts/lookup?acct=${username}`,
          { headers }
        )
      ).json(),

    /** fav or unfav a status, sent asynchronously without waiting for the result */
    fav: (statusId, isfaved) => {
      const command = isfaved ? 'favourite' : 'unfavourite'
      fetch(`https://${$server.value}/api/v1/statuses/${statusId}/${command}`, {
        method: 'POST',
        headers
      })
    },

    /** boost or unboost a status, sent asynchronously without waiting for the result */
    boost: (statusId, isboosted) => {
      const command = isboosted ? 'reblog' : 'unreblog'
      fetch(`https://${$server.value}/api/v1/statuses/${statusId}/${command}`, {
        method: 'POST',
        headers
      })
    },

    /** bookmark or unbookmark a status, sent asynchronously without waiting for the result */
    bookmark: (statusId, isBookmarked) => {
      const command = isBookmarked ? 'bookmark' : 'unbookmark'
      fetch(`https://${$server.value}/api/v1/statuses/${statusId}/${command}`, {
        method: 'POST',
        headers
      })
    },

    /** View or hide nav buttons depending on whether hostname is set and user is logged in. */
    updateNavButtons
  })
})()
