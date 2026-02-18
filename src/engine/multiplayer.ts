import { io, Socket } from "socket.io-client";
import { UserProfile } from "./types";

/** Manages multiplayer connections and communication using Socket.IO */
export class MultiplayerManager {
  private serverUrl: string = "http://localhost:3000";  // default server URL
  private readonly gameId: string = "default-game";     // default game ID
  private readonly roomId: string = "lobby";            // default room to connect to
  private socket: Socket | null = null;
  constructor() {}

  /** 
   * Connect to the multiplayer server with player data. 
   * Must be called manually. 
   */
  connect(userProfile: UserProfile) {
    this.socket = io(this.serverUrl, {
      timeout: 20000,
      query: {
        gameId: this.gameId,
        roomId: this.roomId,
        name: userProfile.name,
        transform: userProfile.transform ? JSON.stringify(userProfile.transform) : undefined,
      },
    });
  }

  /** Listen for events from the server */
  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  /** Emit events to the server */
  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  /** Disconnect from the multiplayer server */
  disconnect() {
    this.socket?.disconnect();
  }

  dispose() {
    this.disconnect();
    this.socket = null;
  }
}