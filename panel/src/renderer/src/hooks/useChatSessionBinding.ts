import { useCallback, useRef, useEffect } from 'react'
import type { SessionSummary } from '../contexts/SessionsContext'

/** Persist before navigating; a late save must not reopen a chat the user left. */
export function useChatSessionBinding(
  chatId: string | null,
  sessions: SessionSummary[],
  open: (chatId: string, sessionId: string) => void,
  reportError: (error: string) => void,
) {
  const currentChat = useRef(chatId)
  const revision = useRef(0)
  if (currentChat.current !== chatId) revision.current++
  currentChat.current = chatId
  useEffect(() => () => { revision.current++ }, [])
  return useCallback(async (sessionId: string) => {
    const session = sessions.find(candidate => candidate.id === sessionId)
    if (!chatId || !session) return
    const request = ++revision.current
    try {
      await window.api.chat.update(chatId, { modelId: session.modelPath, modelPath: session.modelPath })
      if (currentChat.current === chatId && revision.current === request) open(chatId, sessionId)
    } catch (error) {
      if (currentChat.current === chatId && revision.current === request) reportError(String(error))
    }
  }, [chatId, sessions, open, reportError])
}
