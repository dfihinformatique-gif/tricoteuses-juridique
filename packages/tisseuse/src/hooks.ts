import config from "$lib/server/config"

export function getSession(): App.Session {
  return {
    title: config.title,
  }
}
