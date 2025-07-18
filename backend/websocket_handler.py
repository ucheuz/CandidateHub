from flask_sock import Sock
from flask import Flask
import json
from time import time
import asyncio

def init_websocket(app: Flask):
    sock = Sock(app)
    sock.init_app(app)
    # Store connections by candidate ID
    connections = {}
    # Store last activity time for each connection
    last_activity = {}

    @sock.route('/ws/notes')
    def notes_socket(ws):
        candidate_id = None
        try:
            print("New WebSocket connection established")
            while True:
                try:
                    data = ws.receive()
                    if not data:
                        continue

                    # Update last activity time
                    last_activity[ws] = time()
                    
                    try:
                        message = json.loads(data)
                        message_type = message.get('type')
                        
                        # Handle different message types
                        if message_type == 'init':
                            if 'candidateId' in message:
                                candidate_id = message['candidateId']
                                print(f"Initializing WebSocket for candidate: {candidate_id}")
                                if candidate_id not in connections:
                                    connections[candidate_id] = set()
                                connections[candidate_id].add(ws)
                                # Send confirmation
                                ws.send(json.dumps({
                                    'type': 'connected',
                                    'status': 'ok',
                                    'candidateId': candidate_id
                                }))
                        
                        elif message_type == 'ping':
                            ws.send(json.dumps({'type': 'pong'}))
                            continue
                        
                        # Broadcast messages to other clients
                        if candidate_id and candidate_id in connections:
                            for conn in connections[candidate_id]:
                                if conn != ws and conn in last_activity:  # Only send to active connections
                                    try:
                                        conn.send(data)
                                    except Exception as e:
                                        print(f"Error sending to client: {e}")
                                        # Remove stale connection
                                        if conn in last_activity:
                                            del last_activity[conn]

                    except json.JSONDecodeError:
                        print("Invalid JSON received:", data)
                        continue
                    
                except Exception as e:
                    print(f"Error receiving message: {e}")
                    break

        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            print(f"Cleaning up connection for candidate: {candidate_id}")
            # Clean up connection
            if candidate_id and candidate_id in connections:
                connections[candidate_id].remove(ws)
                if not connections[candidate_id]:
                    del connections[candidate_id]
            if ws in last_activity:
                del last_activity[ws]
