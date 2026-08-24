import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { UserMessage, AssistantMessage } from './MessageBubble.jsx'
import InputBar from './InputBar.jsx'
import SparkCode from './SparkCode.jsx'
import { getActivePath } from '../lib/conversationTree.js'

export default function ChatView({
  conversation,
  greeting,
  inputValue,
  onInputChange,
  onSend,
  onStop,
  isStreaming,
  tags,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  activeTag,
  onSetActiveTag,
  onClearTag,
  model,
  setModel,
  thinkingLevel,
  setThinkingLevel,
  boostMode,
  setBoostMode,
  onEditUserMessage,
  onSwitchUserVariant,
  onRegenerate,
  onSwitchAssistantVariant,
  onExport,
  onQuickPrompt,
  sidebarCollapsed,
  onOpenSidebar,
  apiKey,
  modelId,
  sparkCodeAutonomous,
  onOpenSparkCode,
  sparkCodeSession,
  onCloseSparkCode,
}) {
  const scrollRef = useRef(null)
  const path = useMemo(() => (conversation ? getActivePath(conversation.root) : []), [conversation])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [path.length, path[path.length - 1]?.assistantVariant?.content])

  const isEmpty = !conversation || path.length === 0

  return (
    <div className="chat-view">
      {sidebarCollapsed && (
        <button className="chat-open-sidebar-btn" onClick={onOpenSidebar} aria-label="サイドバーを開く">
          <PanelLeftOpen size={20} />
        </button>
      )}

      {isEmpty ? (
        <div className="chat-empty">
          <h1 className="chat-greeting">{greeting}</h1>
          <div className="chat-empty-input">
            <InputBar
              value={inputValue}
              onChange={onInputChange}
              onSend={onSend}
              onStop={onStop}
              isStreaming={isStreaming}
              tags={tags}
              attachedFiles={attachedFiles}
              onAttachFiles={onAttachFiles}
              onRemoveFile={onRemoveFile}
              activeTag={activeTag}
              onSetActiveTag={onSetActiveTag}
              onClearTag={onClearTag}
              model={model}
              setModel={setModel}
              thinkingLevel={thinkingLevel}
              setThinkingLevel={setThinkingLevel}
              boostMode={boostMode}
              setBoostMode={setBoostMode}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="chat-scroll scroll-y hide-scrollbar" ref={scrollRef}>
            <div className="chat-messages">
              {path.map(({ turn, userVariant, assistantVariant }) => (
                <div key={turn.id} className="chat-turn">
                  <UserMessage
                    turn={turn}
                    userVariant={userVariant}
                    userIndex={turn.activeUserIndex}
                    userTotal={turn.userVariants.length}
                    onEdit={onEditUserMessage}
                    onSwitchVariant={onSwitchUserVariant}
                  />
                  {assistantVariant && (
                    <AssistantMessage
                      turn={turn}
                      assistantVariant={assistantVariant}
                      assistantIndex={userVariant.activeAssistantIndex}
                      assistantTotal={userVariant.assistantVariants.length}
                      onRegenerate={onRegenerate}
                      onSwitchVariant={onSwitchAssistantVariant}
                      onExport={onExport}
                      onQuickPrompt={onQuickPrompt}
                      onOpenSparkCode={onOpenSparkCode}
                      exportFormat={turn.exportFormat}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="chat-input-dock">
            <InputBar
              value={inputValue}
              onChange={onInputChange}
              onSend={onSend}
              onStop={onStop}
              isStreaming={isStreaming}
              tags={tags}
              attachedFiles={attachedFiles}
              onAttachFiles={onAttachFiles}
              onRemoveFile={onRemoveFile}
              activeTag={activeTag}
              onSetActiveTag={onSetActiveTag}
              onClearTag={onClearTag}
              model={model}
              setModel={setModel}
              thinkingLevel={thinkingLevel}
              setThinkingLevel={setThinkingLevel}
              boostMode={boostMode}
              setBoostMode={setBoostMode}
            />
          </div>
        </>
      )}

      {sparkCodeSession && (
        <SparkCode
          session={sparkCodeSession}
          apiKey={apiKey}
          modelId={modelId}
          autonomous={sparkCodeAutonomous}
          onClose={onCloseSparkCode}
        />
      )}
    </div>
  )
}
