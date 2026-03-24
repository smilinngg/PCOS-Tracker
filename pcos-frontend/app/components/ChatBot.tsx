"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircleHeart, X, Send, Sparkles, Bot, User, Loader2, ChevronDown, Trash2, Calendar } from "lucide-react"
import { useCycleInfo } from "../context/CycleContext"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  "What are common PCOS symptoms?",
  "How does BMI affect PCOS risk?",
  "What lifestyle changes help with PCOS?",
  "Can PCOS affect fertility?",
]

const CYCLE_SUGGESTED_QUESTIONS = [
  "When is my next period?",
  "What was my last period date?",
  "When is my ovulation window?",
  "What cycle day am I on today?",
]

interface ChatBotProps {
  cycleAware?: boolean
}

export default function ChatBot({ cycleAware = false }: ChatBotProps) {
  const { cycleInfo } = useCycleInfo()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: cycleAware
        ? "Hi! I'm your cycle & wellness coach 💜 I can help with period tracking, fertility planning, ovulation insights, and natural wellness tips. How can I support your reproductive health today?"
        : "Hi! I'm your PCOS health assistant 💜 I can help explain symptoms, risks, lifestyle tips, and more. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setHasNewMessage(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, messages])

  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true)
    }
  }, [messages.length])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isStreaming) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }

    // Add user message
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsStreaming(true)

    // Add an empty assistant message placeholder
    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ])

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, cycleAware, cycleData: cycleInfo }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error("Connection failed")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || "" // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") break

          try {
            const parsed = JSON.parse(payload)
            if (parsed.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `⚠️ ${parsed.error}` }
                    : m
                )
              )
            } else if (parsed.token) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.token }
                    : m
                )
              )
              scrollToBottom()
            }
          } catch {
            // malformed JSON chunk, skip
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === (Date.now() + 1).toString() || m.content === ""
              ? {
                  ...m,
                  content:
                    "⚠️ Connection error. Please make sure the backend server is running.",
                }
              : m
          )
        )
        // Fallback: clean up empty assistant message
        setMessages((prev) =>
          prev.map((m) =>
            m.role === "assistant" && m.content === ""
              ? {
                  ...m,
                  content:
                    "⚠️ Connection error. Please make sure the backend server is running.",
                }
              : m
          )
        )
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const stopStreaming = () => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    stopStreaming()
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm your PCOS health assistant 💜 I can help explain symptoms, risks, lifestyle tips, and more. How can I help you today?",
        timestamp: new Date(),
      },
    ])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="chatbot-toggle"
        onClick={() => setIsOpen((p) => !p)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #a855f7, #ec4899)",
          boxShadow: "0 8px 32px rgba(168, 85, 247, 0.5)",
        }}
        aria-label="Open PCOS Chat Assistant"
      >
        <div className="relative">
          {isOpen ? (
            <ChevronDown className="w-7 h-7 text-white" />
          ) : (
            <MessageCircleHeart className="w-7 h-7 text-white" />
          )}
          {hasNewMessage && !isOpen && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
      </button>

      {/* Chat Window */}
      <div
        id="chatbot-window"
        className={`fixed bottom-28 right-6 z-50 w-[380px] max-w-[calc(100vw-1.5rem)] transition-all duration-500 ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-8 pointer-events-none"
        }`}
        style={{ transformOrigin: "bottom right" }}
      >
        <div
          className="rounded-3xl overflow-hidden flex flex-col"
          style={{
            height: "520px",
            background: "rgba(15, 15, 30, 0.90)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            boxShadow:
              "0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.2))",
              borderBottom: "1px solid rgba(168, 85, 247, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">
                  {cycleAware ? "Cycle Wellness Coach" : "PCOS Health Assistant"}
                </p>
                {cycleAware && cycleInfo?.next_predicted && (
                  <p className="text-xs text-pink-300 leading-tight flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    Next period: {cycleInfo.next_predicted}
                  </p>
                )}
                {!cycleInfo?.next_predicted && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full border-2 border-white/20 ${isStreaming ? "bg-amber-400 animate-pulse" : "bg-teal-400"}`} />
                    <span className={`text-xs font-medium ${isStreaming ? "text-amber-400" : "text-teal-400"}`}>
                      {isStreaming ? "Typing..." : "Online"}
                    </span>
                  </div>
                )}
                {cycleAware && cycleInfo?.next_predicted && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full border-2 border-white/20 ${isStreaming ? "bg-amber-400 animate-pulse" : "bg-teal-400"}`} />
                    <span className={`text-xs font-medium ${isStreaming ? "text-amber-400" : "text-teal-400"}`}>
                      {isStreaming ? "Typing..." : "Online"}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-2xl shrink-0 flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-rose-600"
                      : "bg-gradient-to-br from-purple-600 to-pink-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`group flex flex-col max-w-[78%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={
                      msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "white",
                            borderBottomRightRadius: "4px",
                          }
                        : {
                            background: "rgba(255,255,255,0.07)",
                            color: "rgba(255,255,255,0.9)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderBottomLeftRadius: "4px",
                          }
                    }
                  >
                    {msg.content}
                    {/* Blinking cursor on the active streaming message */}
                    {isStreaming &&
                      msg.role === "assistant" &&
                      msg.id !== "welcome" &&
                      messages[messages.length - 1].id === msg.id && (
                        <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-middle animate-pulse" />
                      )}
                  </div>
                  <p className="text-xs text-stone-600 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions - shown only on first message */}
          {messages.length === 1 && !isStreaming && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {(cycleAware ? CYCLE_SUGGESTED_QUESTIONS : SUGGESTED_QUESTIONS).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(168, 85, 247, 0.1)",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                    color: "rgba(216, 180, 254, 0.9)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div
            className="px-4 py-4 shrink-0"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <div
              className="flex items-end gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(168, 85, 247, 0.2)",
              }}
            >
              <textarea
                ref={inputRef}
                id="chatbot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={cycleAware ? "Ask about your period, ovulation, cycle day..." : "Ask about PCOS..."}
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-white placeholder-stone-500 resize-none focus:outline-none max-h-24 leading-relaxed disabled:opacity-50"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                id="chatbot-send"
                onClick={isStreaming ? stopStreaming : () => sendMessage()}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30"
                disabled={!input.trim() && !isStreaming}
                style={{
                  background:
                    isStreaming
                      ? "rgba(239, 68, 68, 0.7)"
                      : input.trim()
                      ? "linear-gradient(135deg, #a855f7, #ec4899)"
                      : "rgba(255,255,255,0.1)",
                  boxShadow:
                    input.trim() && !isStreaming
                      ? "0 4px 16px rgba(168, 85, 247, 0.4)"
                      : "none",
                }}
                title={isStreaming ? "Stop generating" : "Send message"}
              >
                {isStreaming ? (
                  <span className="w-3.5 h-3.5 bg-white rounded-sm" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-center text-xs text-stone-600 mt-2">
              <kbd className="px-1 py-0.5 rounded text-stone-500 bg-white/5 text-xs">Enter</kbd> to send ·{" "}
              <kbd className="px-1 py-0.5 rounded text-stone-500 bg-white/5 text-xs">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
