import { randomUUID } from "crypto";
import type { Session } from "./agent/types.js";

class SessionStore {
  private sessions = new Map<string, Session>();

  create(): Session {
    const session: Session = {
      id: randomUUID(),
      messages: [],
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getOrCreate(id?: string): Session {
    if (id) {
      const existing = this.sessions.get(id);
      if (existing) return existing;
    }
    return this.create();
  }
}

export const sessionStore = new SessionStore();
