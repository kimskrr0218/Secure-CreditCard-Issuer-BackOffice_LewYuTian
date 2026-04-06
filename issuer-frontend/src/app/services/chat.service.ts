import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  reply: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private chatUrl = '/api/chat';

  constructor(private http: HttpClient) {}

  sendMessage(messages: ChatMessage[]): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.chatUrl, { messages });
  }
}
