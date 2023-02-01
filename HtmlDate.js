import { p, time } from 'https://unpkg.com/ez-html-elements'

const DAY_MS = 24 * 60 * 60 * 1000

/** Create a date object from a standard string representation */
export default (dateString) => {
  // HtmlDate PRIVATE:

  function dateView () {
    const ms = Date.now() - Date.parse(dateString)
    if (ms < 1500) {
      return `${ms} ms`
    }
    const seconds = Math.round(ms / 1000)
    if (seconds < 90) {
      return `${seconds}s`
    }
    const minutes = Math.round(seconds / 60)
    if (minutes < 90) {
      return `${minutes}min`
    }
    const hours = Math.round(minutes / 60)
    if (hours < 90) {
      return `${hours}h`
    }
    const days = Math.round(hours / 24)
    return `${days}d`
  }

  // HtmlDate PUBLIC:
  return Object.freeze({
    /** Generate HTML text */
    html: () => time({ datetime: dateString }, dateView())
  })
}
