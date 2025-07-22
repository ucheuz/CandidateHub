import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
  Divider,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';

const NotesHub = ({ candidateId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef(null);
  const notesEndRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const maxReconnectAttempts = 3;

  const scrollToBottom = React.useCallback(() => {
    notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch notes from the server
  const fetchNotes = React.useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/candidate/${candidateId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, [candidateId, scrollToBottom]);

  // Initialize WebSocket connection and handle messages
  useEffect(() => {
    const handleWebSocketMessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'note':
          setNotes(prev => {
            const newNotes = [...prev, data.note];
            // Use setTimeout to ensure state has updated before scrolling
            setTimeout(scrollToBottom, 0);
            return newNotes;
          });
          break;
        case 'typing':
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 1000);
          break;
        case 'connected':
          console.log('WebSocket initialization confirmed:', data);
          break;
        case 'pong':
          // Received pong from server, connection is alive
          break;
        default:
          console.log('Received unknown message type:', data.type);
      }
    };

    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:5000/ws/notes');
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttempts.current = 0;
          
          // Send initial message with candidateId
          wsRef.current.send(JSON.stringify({
            type: 'init',
            candidateId: candidateId
          }));

          // Start ping interval
          const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000); // Send ping every 30 seconds

          // Store interval ID for cleanup
          wsRef.current.pingInterval = pingInterval;
        };
        
        wsRef.current.onclose = () => {
          setIsConnected(false);
          // Only try to reconnect if we haven't exceeded max attempts
          if (reconnectAttempts.current < maxReconnectAttempts) {
            console.log(`WebSocket connection closed. Attempting to reconnect... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
            reconnectAttempts.current += 1;
            setTimeout(connectWebSocket, 3000);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        wsRef.current.onmessage = handleWebSocketMessage;
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    // Initial setup
    connectWebSocket();
    fetchNotes();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        // Clear ping interval
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }
        wsRef.current.close();
      }
    };
  }, [candidateId, fetchNotes, maxReconnectAttempts, scrollToBottom]);

  const handleSendNote = async (shouldSave = false) => {
    console.log('handleSendNote called with shouldSave:', shouldSave);
    
    if (!newNote.trim()) {
      console.log('Note is empty, returning');
      return;
    }

    console.log('Candidate ID:', candidateId);
    // Get current user from localStorage
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    } catch {}
    const noteData = {
      candidateId: candidateId,
      content: newNote,
      interviewer: {
        name: currentUser && currentUser.name ? currentUser.name : 'Unknown',
        avatar: currentUser && currentUser.avatar ? currentUser.avatar : null
      },
      isSaved: shouldSave,
      type: 'candidate_note'
    };
    
    console.log('Created note data:', noteData);

    try {
      // Always update local state immediately for better UX
      setNotes(prev => [...prev, noteData]);
      
      // Try WebSocket if available
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'note',
          note: noteData
        }));
      }

      if (shouldSave) {
        const url = `http://localhost:5000/api/candidate/${candidateId}/notes`;
        console.log('Saving note to database...');
        console.log('URL:', url);
        console.log('Request data:', noteData);
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(noteData)
          });

          console.log('Response status:', response.status);
          
          const responseText = await response.text();
          console.log('Raw response:', responseText);

          if (!response.ok) {
            let errorData;
            try {
              errorData = JSON.parse(responseText);
            } catch (e) {
              errorData = { error: responseText || 'Unknown error' };
            }
            console.error('Server error:', errorData);
            throw new Error(errorData.error || 'Failed to save note');
          }

          let savedNote;
          try {
            savedNote = JSON.parse(responseText);
            console.log('Note saved successfully:', savedNote);
            
            // Update the note in local state with the server response
            setNotes(prev => prev.map(note => 
              note === noteData ? { ...savedNote } : note
            ));
          } catch (e) {
            console.error('Error parsing success response:', e);
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          console.error('Error saving note:', error);
          // Remove the note from local state if save failed
          setNotes(prev => prev.filter(note => note !== noteData));
          alert('Failed to save note: ' + error.message);
        }
      }
      
      setNewNote('');
    } catch (error) {
      console.error('Error handling note:', error);
    }
  };

  const handleTyping = () => {
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    } catch {}
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        interviewer: currentUser && currentUser.name ? currentUser.name : 'Unknown'
      }));
    }
  };

  return (
    <Paper 
      elevation={3}
      sx={{
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        mt: 2
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Collaborative Notes</Typography>
        {!isConnected && (
          <Tooltip title="Offline mode - some features may be limited">
            <Typography variant="caption" color="warning.main">
              ● Offline
            </Typography>
          </Tooltip>
        )}
      </Box>
      <Divider />
      
      {/* Notes Display Area */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {notes.map((note, index) => {
          // Get current user from localStorage
          let currentUser = null;
          try {
            currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
          } catch {}
          const isMe = currentUser && note.interviewer.name === currentUser.name;
          return (
            <Box 
              key={index}
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                flexDirection: isMe ? 'row-reverse' : 'row',
                justifyContent: isMe ? 'flex-end' : 'flex-start'
              }}
            >
              <Avatar src={note.interviewer.avatar}>
                {note.interviewer.name[0]}
              </Avatar>
              <Box sx={{ maxWidth: '80%' }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 'bold',
                    textAlign: isMe ? 'right' : 'left'
                  }}
                >
                  {isMe ? `${currentUser.name} (ME)` : note.interviewer.name}
                </Typography>
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 1.5,
                    bgcolor: isMe 
                      ? (note.isSaved ? '#0C3F05' : '#1976d2') 
                      : (note.isSaved ? 'primary.light' : 'grey.100'),
                    color: isMe ? 'white' : 'inherit',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                  }}
                >
                  <Typography variant="body1">
                    {note.content}
                  </Typography>
                </Paper>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    display: 'block',
                    textAlign: isMe ? 'right' : 'left'
                  }}
                >
                  {new Date(note.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          );
        })}
        {isTyping && (
          <Typography variant="caption" color="text.secondary">
            Someone is typing...
          </Typography>
        )}
        <div ref={notesEndRef} />
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Write your notes here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyUp={handleTyping}
            size="small"
          />
          <Button 
            variant="contained" 
            endIcon={<SendIcon />}
            onClick={() => handleSendNote(false)}
          >
            Send
          </Button>
          <Button
            variant="contained"
            color="success"
            endIcon={<SaveIcon />}
            onClick={() => {
              console.log('Submit button clicked');
              handleSendNote(true);
            }}
          >
            Submit
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default NotesHub;
