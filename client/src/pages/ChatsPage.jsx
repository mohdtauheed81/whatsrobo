import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChats, fetchChatMessages, selectChat, archiveChat, sendChatMessage } from "../redux/chatsSlice";
import { MessageSquare, Archive, Send, Loader } from "lucide-react";
import "../styles/chats.css";

function ChatsPage() {
  const dispatch = useDispatch();
  const { chats, selectedChat, chatMessages, unreadCount, loading } = useSelector(state => state.chats);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { dispatch(fetchChats()); }, [dispatch]);

  useEffect(() => {
    if (selectedChat) {
      dispatch(fetchChatMessages(selectedChat._id));
      setReplyText("");
    }
  }, [selectedChat, dispatch]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;
    try {
      setSending(true);
      await dispatch(sendChatMessage({ chatId: selectedChat._id, message: replyText.trim() })).unwrap();
      setReplyText("");
    } catch (err) {
      alert(err || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async (chatId) => {
    if (window.confirm("Archive this chat?")) {
      await dispatch(archiveChat(chatId));
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.contactPhoneNumber?.includes(searchQuery)
  );

  return (
    <div className="chats-page">
      <div className="chats-container">
        {/* Chat List */}
        <div className="chat-list">
          <div className="chat-list-header">
            <h2>Inbox {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}</h2>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="chats">
            {loading && chats.length === 0 ? (
              <div className="loading-state"><Loader size={24} className="spinner" /></div>
            ) : filteredChats.length === 0 ? (
              <div className="empty-state">
                <MessageSquare size={48} />
                <p>No chats yet</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div
                  key={chat._id}
                  className={"chat-item" + (selectedChat?._id === chat._id ? " active" : "")}
                  onClick={() => dispatch(selectChat(chat))}
                >
                  <div className="chat-item-header">
                    <h4>{chat.contactName || chat.contactPhoneNumber}</h4>
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge">{chat.unreadCount}</span>
                    )}
                  </div>
                  <p className="last-message">{chat.lastMessage || "No messages yet"}</p>
                  <span className="timestamp">
                    {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString() : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className="chat-view">
          {selectedChat ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <h2>{selectedChat.contactName || selectedChat.contactPhoneNumber}</h2>
                  <p>{selectedChat.contactPhoneNumber}</p>
                </div>
                <div className="chat-actions">
                  <button className="btn-icon" title="Archive" onClick={() => handleArchive(selectedChat._id)}>
                    <Archive size={20} />
                  </button>
                </div>
              </div>

              <div className="messages-view">
                {chatMessages.length === 0 ? (
                  <div className="empty-messages"><p>No messages yet</p></div>
                ) : (
                  chatMessages.map(msg => (
                    <div
                      key={msg._id}
                      className={"message" + (msg.senderType === "company" || msg.sender === "company" ? " outgoing" : " incoming")}
                    >
                      <div className="message-content">
                        <p>{msg.messageText || msg.message}</p>
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="message-input" onSubmit={handleSendReply}>
                <input
                  type="text"
                  placeholder="Type a reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !replyText.trim()}>
                  {sending ? <Loader size={18} className="spinner" /> : <Send size={18} />}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <MessageSquare size={48} />
              <p>Select a chat to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatsPage;
