import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, TrendingUp, AlertTriangle, Route, DollarSign, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function RateShoppingAI({ shipmentDetails, comparison, selectedQuote }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI shipping advisor. I can help you:\n\n• Analyze rate comparisons\n• Suggest optimal routes\n• Predict delays or cost increases\n• Compare carrier reliability\n• Recommend cost-saving strategies\n\nWhat would you like to know?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    {
      icon: TrendingUp,
      label: "Best Route",
      prompt: "What's the most cost-effective route for this shipment?",
      color: "text-green-600"
    },
    {
      icon: AlertTriangle,
      label: "Delay Risk",
      prompt: "Are there any potential delays or risks I should know about?",
      color: "text-orange-600"
    },
    {
      icon: Route,
      label: "Compare Carriers",
      prompt: "Compare the carriers and recommend the best option considering price, speed, and reliability.",
      color: "text-blue-600"
    },
    {
      icon: DollarSign,
      label: "Save Money",
      prompt: "How can I reduce shipping costs for this route?",
      color: "text-purple-600"
    }
  ];

  const buildContext = () => {
    let context = "Current shipment details:\n";
    context += `- Route: ${shipmentDetails.origin_port} → ${shipmentDetails.destination_port}\n`;
    context += `- Container: ${shipmentDetails.container_type}\n`;
    context += `- Weight: ${shipmentDetails.cargo_weight} kg\n`;
    context += `- Volume: ${shipmentDetails.cargo_volume} m³\n`;
    
    if (comparison) {
      context += `\nAvailable rates:\n`;
      comparison.quotes.forEach((quote, idx) => {
        context += `${idx + 1}. ${quote.carrier_name}: $${quote.total_rate} (${quote.transit_time_days} days)\n`;
      });
      
      if (comparison.best_rate) {
        context += `\nBest rate: ${comparison.best_rate.carrier_name} at $${comparison.best_rate.total_rate}\n`;
      }
    }
    
    if (selectedQuote) {
      context += `\nCurrently selected: ${selectedQuote.carrier_name} ($${selectedQuote.total_rate})\n`;
    }
    
    return context;
  };

  const handleSend = async (message = input) => {
    if (!message.trim()) return;

    const userMessage = { role: "user", content: message };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const context = buildContext();
      const fullPrompt = `You are an expert shipping and logistics advisor with deep knowledge of ocean freight, carrier operations, and global trade routes.

${context}

User question: ${message}

Provide practical, actionable advice. Be concise but thorough. If predicting delays or costs, explain your reasoning. If comparing carriers, consider price, transit time, reliability, and service quality. Use data-driven insights when possible.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: true
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response
      }]);
    } catch (error) {
      toast.error("Failed to get AI response");
      console.error(error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (prompt) => {
    setInput(prompt);
    handleSend(prompt);
  };

  const handleWhatsAppShare = () => {
    if (messages.length <= 1) {
      toast.error("No conversation to share yet");
      return;
    }

    let content = "🚢 AI Shipping Advisor Conversation\n\n";
    content += `Route: ${shipmentDetails.origin_port} → ${shipmentDetails.destination_port}\n`;
    content += `Container: ${shipmentDetails.container_type}\n\n`;
    content += "---\n\n";

    messages.forEach((msg, idx) => {
      if (idx === 0) return; // Skip initial greeting
      const label = msg.role === "user" ? "Question" : "AI Advisor";
      content += `${label}:\n${msg.content}\n\n`;
    });

    content += "---\nPowered by eFinAuto OFMS";

    const message = encodeURIComponent(content);
    window.open(`https://wa.me/?text=${message}`, '_blank');
    toast.success("Opening WhatsApp...");
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Shipping Advisor
          </CardTitle>
          {messages.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="bg-green-50 hover:bg-green-100"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Share on WhatsApp
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="ml-4 mb-2 list-disc">{children}</ul>,
                      ol: ({ children }) => <ol className="ml-4 mb-2 list-decimal">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-4 flex-shrink-0">
            <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  className="justify-start text-left h-auto py-2"
                  disabled={loading}
                >
                  <action.icon className={`w-4 h-4 mr-2 flex-shrink-0 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !loading && handleSend()}
              placeholder="Ask about rates, routes, delays, or savings..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Ask about specific carriers, compare options, or get route recommendations
          </p>
        </div>
      </CardContent>
    </Card>
  );
}