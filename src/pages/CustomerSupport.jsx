import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Bot, 
  User, 
  Loader2,
  MessageSquare,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from 'react-markdown';

export default function CustomerSupportPage() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await supabase.agents.listConversations({
        agent_name: "customer_support"
      });
      setConversations(convs || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const createNewConversation = async () => {
    try {
      const conv = await supabase.agents.createConversation({
        agent_name: "customer_support",
        metadata: {
          name: `Support Chat ${format(new Date(), 'MMM d, h:mm a')}`,
          channel: "web"
        }
      });
      setConversations([conv, ...conversations]);
      setSelectedConversation(conv);
      toast.success("New conversation started");
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;

    const userMessage = message;
    setMessage("");

    try {
      await supabase.agents.addMessage(selectedConversation, {
        role: "user",
        content: userMessage
      });
    } catch (error) {
      toast.error("Failed to send message");
      setMessage(userMessage);
    }
  };

  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = supabase.agents.subscribeToConversation(
      selectedConversation.id,
      (data) => {
        setSelectedConversation(prev => ({
          ...prev,
          messages: data.messages
        }));
      }
    );

    return () => unsubscribe();
  }, [selectedConversation?.id]);

  const whatsappURL = supabase.agents.getWhatsAppConnectURL('customer_support');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bot className="w-6 h-6" />
              AI Customer Support
            </h1>
            <p className="text-sm text-gray-300 mt-1">Chat with AI assistant or connect via WhatsApp</p>
          </div>
          <a 
            href={whatsappURL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Connect WhatsApp
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Conversations</CardTitle>
                  <Button onClick={createNewConversation} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2">
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedConversation?.id === conv.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm truncate">
                          {conv.metadata?.name || 'Conversation'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {conv.messages?.length || 0} messages
                      </p>
                      {conv.metadata?.channel && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {conv.metadata.channel}
                        </Badge>
                      )}
                    </button>
                  ))}
                  {conversations.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No conversations yet</p>
                      <p className="text-xs mt-1">Click "New" to start</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="col-span-9">
            <Card className="h-full flex flex-col">
              {selectedConversation ? (
                <>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {selectedConversation.metadata?.name || 'AI Support Agent'}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Online</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedConversation.messages?.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="text-sm">{msg.content}</p>
                          ) : (
                            <ReactMarkdown 
                              className="text-sm prose prose-sm max-w-none"
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          )}
                          
                          {msg.tool_calls?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.tool_calls.map((toolCall, tidx) => (
                                <div key={tidx} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>{toolCall.name?.split('.').pop()}</span>
                                  {toolCall.status === 'running' && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={!message.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Select a conversation</p>
                    <p className="text-sm">or create a new one to start chatting</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}