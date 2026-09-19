import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Rewritten from the shadcn default, which set state inside an effect and
// tripped react-hooks/set-state-in-effect. useSyncExternalStore is the right
// primitive for subscribing to a media query and keeps the same public API.

// useSyncExternalStore calls getSnapshot on every render and on every change,
// so the MediaQueryList is built once and shared rather than per call.
let mql: MediaQueryList | undefined
const getMql = () => (mql ??= window.matchMedia(QUERY))

function subscribe(onChange: () => void) {
  const target = getMql()
  target.addEventListener("change", onChange)
  return () => target.removeEventListener("change", onChange)
}

function getSnapshot() {
  return getMql().matches
}

// The server has no viewport, so assume desktop and let hydration correct it.
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
