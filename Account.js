import Host from './Host.js'
import { a, em, img } from 'https://unpkg.com/ez-html-elements'

/** Create an account object from the JSON returned from the server. */
export default (account) => {
  // Account PUBLIC:
  return Object.freeze({
    /** Is the given id the same as this account's id? */
    sameId: (id) => id === account.id,

    /** Generate HTML text */
    html: () => {
      const accountServer = account.url.match(/https:\/\/([^/]+)\//)[1]

      return a(
        { href: `#accounts/${account.id}` },
        img(['inline'], {
          src: account.avatar,
          width: 48,
          height: 48,
          alt: `@${account.username}`
        }) +
          Host(accountServer).faviconHtml() +
          '@' +
          account.username +
          '@' +
          accountServer,
        em('(' + account.display_name + ')')
      )
    }
  })
}
