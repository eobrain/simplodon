import { img } from 'https://unpkg.com/ez-html-elements'

export default (host) => {
  return Object.freeze({
    faviconHtml: () =>
      img(['inline'], {
        src: `https://${host}/favicon.ico`,
        width: 48,
        height: 48,
        alt: host
      })
  })
}
