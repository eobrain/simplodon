import { p, time } from 'https://unpkg.com/ez-html-elements'

const DAY_MS = 24 * 60 * 60 * 1000

/** Create a date object from a standard string representation */
export default (dateString) => {
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
