import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Loader2, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function AIChatInterface({ financialData, companyId }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI Financial Assistant. I can help you understand your company's financial performance, answer questions about your data, and provide insights. What would you like to know?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    "What's my total revenue this month?",
    "Show me my top expenses",
    "How is my cash flow?",
    "Are there any overdue invoices?",
    "What's my profit margin?",
    "Compare this month to last month"
  ];

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Prepare financial context
      const totalRevenue = financialData.sales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
      const totalExpenses = financialData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingTransactions = financialData.bankTransactions.filter(t => t.status === 'pending').length;
      const unreconciledTransactions = financialData.bankTransactions.filter(t => !t.reconciled).length;

      const context = `
Financial Data Summary:
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Expenses: $${totalExpenses.toLocaleString()}
- Net Profit: $${(totalRevenue - totalExpenses).toLocaleString()}
- Total Sales: ${financialData.sales.length}
- Pending Bank Transactions: ${pendingTransactions}
- Unreconciled Transactions: ${unreconciledTransactions}
- Total Repair Orders: ${financialData.repairs.length}
- Active GL Accounts: ${financialData.accounts.length}

Recent Sales: ${JSON.stringify(financialData.sales.slice(0, 10).map(s => ({
  date: s.sale_date,
  amount: s.grand_total || s.sale_price,
  customer: s.customer_name,
  status: s.payment_status
})))}

Recent Expenses: ${JSON.stringify(financialData.expenses.slice(0, 10).map(e => ({
  date: e.expense_date,
  amount: e.amount,
  category: e.category,
  vendor: e.vendor_name
})))}
`;

      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `You are a financial assistant helping analyze a company's financial data. 
        
User question: ${userMessage}

Financial context: ${context}

Provide a helpful, concise answer based on the data. Include specific numbers and insights. 
If the user asks about trends, calculations, or comparisons, provide detailed analysis.
If you identify any concerns or opportunities, mention them.
Keep your response conversational and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            key_insights: { type: "array", items: { type: "string" } },
            action_items: { type: "array", items: { type: "string" } }
          }
        }
      });

      const assistantMessage = {
        role: "assistant",
        content: response.answer,
        insights: response.key_insights,
        actions: response.action_items
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Assistant error:", error);
      toast.error("Failed to get response from AI assistant");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I encountered an error processing your question. Please try again."
      }]);
    }

    setIsLoading(false);
  };

  const handleSuggestedQuestion = (question) => {
    setInput(question);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Financial Q&A
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-600">AI Assistant</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.insights && message.insights.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Key Insights:
                    </p>
                    {message.insights.map((insight, i) => (
                      <Badge key={i} variant="outline" className="mr-1 mb-1">
                        {insight}
                      </Badge>
                    ))}
                  </div>
                )}

                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Action Items:
                    </p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      {message.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="px-6 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-600 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your financial data..."
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}