/**
 * motion-dom memoizes WAAPI support once at module load via
 * `hasOwnProperty(Element.prototype, "animate")`. happy-dom implements
 * `Element.animate`, but its `Animation.cancel()` always rejects the
 * animation's `finished` promise with AbortError, which surfaces as an
 * unhandled rejection whenever a motion component unmounts.
 *
 * Removing the property before motion loads makes it fall back to the JS
 * animation driver (as it does under jsdom), which cancels cleanly.
 */
if (typeof Element !== "undefined") {
  delete (Element.prototype as Partial<{ animate?: unknown }>).animate
}