"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Sparkles } from "lucide-react";

import { TextStreamChatTransport } from "ai";

export function ChatAgent() {
  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/ai/chat" }),
  });
  
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <Card className="flex flex-col h-[600px] shadow-sm border-muted">
      <CardHeader className="border-b bg-muted/20 px-6 py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          CRM Chatbot
        </CardTitle>
        <CardDescription>
          CRM ma'lumotlari bo'yicha savol bering (masalan: "Kimning to'lovi kechikkan?")
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-4">
            <Sparkles className="w-12 h-12 text-muted-foreground/30" />
            <p>Salom! Men Maktabcha CRM sun'iy intellekt yordamchisiman.<br/>Qanday yordam bera olaman?</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] ${
                m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`rounded-xl px-4 py-2 ${
                m.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-foreground"
              }`}>
                <div className="whitespace-pre-wrap text-sm">{m.parts?.map((p: any) => p.type === 'text' ? p.text : '').join('')}</div>
                {m.parts?.some((p: any) => p.type === 'tool-invocation') && (
                  <div className="mt-2 text-xs opacity-70 border-t pt-2 border-primary-foreground/20">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Ma'lumotlar bazasidan qidirilmoqda...
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
             <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
             </div>
             <div className="bg-muted text-foreground rounded-xl px-4 py-2 text-sm flex items-center gap-2">
               <span className="animate-pulse">Yozmoqda...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      
      <div className="p-4 border-t bg-muted/10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="O'zbek tilida savol bering..."
            className="flex-1 bg-background border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
