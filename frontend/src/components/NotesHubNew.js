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
  Tooltip,
  IconButton,
  Badge,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { 
  Send as SendIcon, 
  Save as SaveIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Circle as CircleIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';

const NotesHub = ({ candidateId, onNoteSaved }) => {
  const [notes, setNotes] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
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

  // Fetch notes and feedback from the server
  const fetchNotes = React.useCallback(async () => {
    try {
      const [notesResponse, feedbackResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/candidate/${candidateId}/notes`),
        fetch(`http://localhost:5000/api/candidate/${candidateId}/feedback`)
      ]);
      
      if (notesResponse.ok && feedbackResponse.ok) {
        const notesData = await notesResponse.json();
        const feedbackData = await feedbackResponse.json();
        
        setNotes(notesData.notes || []);
        setFeedback(feedbackData.feedback || []);
        
        // Combine and sort all messages by timestamp
        const combined = [
          ...(notesData.notes || []).map(note => ({ ...note, messageType: 'note' })),
          ...(feedbackData.feedback || []).map(fb => ({ ...fb, messageType: 'feedback', isSaved: true }))
        ];
        
        combined.sort((a, b) => {
          const timestampA = a.timestamp?.seconds || 0;
          const timestampB = b.timestamp?.seconds || 0;
          return timestampA - timestampB;
        });
        
        setAllMessages(combined);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching notes and feedback:', error);
    }
  }, [candidateId, scrollToBottom]);

  // Initialize WebSocket connection and handle messages
  useEffect(() => {
    const handleWebSocketMessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'connected':
          console.log('WebSocket initialized for candidate:', data.candidateId);
          break;
        case 'note':
          // Add new message to the combined list only if it doesn't already exist
          setAllMessages(prev => {
            const exists = prev.some(msg => 
              msg.content === data.content && 
              msg.interviewer.name === data.interviewer.name &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000
            );
            if (!exists) {
              const newMessage = { ...data, messageType: data.isSaved ? 'feedback' : 'note' };
              return [...prev, newMessage];
            }
            return prev;
          });
          
          // Also update the specific arrays
          if (data.isSaved) {
            setFeedback(prev => {
              const exists = prev.some(fb => 
                fb.content === data.content && 
                fb.interviewer.name === data.interviewer.name &&
                Math.abs(new Date(fb.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000
              );
              return exists ? prev : [...prev, data];
            });
          } else {
            setNotes(prev => {
              const exists = prev.some(note => 
                note.content === data.content && 
                note.interviewer.name === data.interviewer.name &&
                Math.abs(new Date(note.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000
              );
              return exists ? prev : [...prev, data];
            });
          }
          scrollToBottom();
          break;
        case 'typing':
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
          break;
        case 'pong':
          // Handle pong response
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:5000/ws/notes');
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttempts.current = 0;
          
          // Send init message
          wsRef.current.send(JSON.stringify({
            type: 'init',
            candidateId: candidateId
          }));

          // Set up ping interval
          wsRef.current.pingInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          
          // Clear ping interval
          if (wsRef.current && wsRef.current.pingInterval) {
            clearInterval(wsRef.current.pingInterval);
          }
          
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
    
    // Generate a temporary ID for tracking
    const tempId = Date.now().toString();
    const noteData = {
      candidateId: candidateId,
      content: newNote,
      interviewer: {
        name: 'Current User',
        avatar: null
      },
      isSaved: shouldSave,
      timestamp: new Date().toISOString(),
      tempId: tempId
    };

    try {
      // Generate a temporary ID for tracking
      const tempId = Date.now().toString();
      const noteData = {
        candidateId: candidateId,
        content: newNote,
        interviewer: {
          name: 'Current User',
          avatar: null
        },
        isSaved: shouldSave,
        timestamp: new Date().toISOString(),
        tempId: tempId
      };

      // Add note to local state immediately for responsiveness
      const messageWithType = { ...noteData, messageType: shouldSave ? 'feedback' : 'note' };
      setAllMessages(prev => [...prev, messageWithType]);
      
      if (shouldSave) {
        setFeedback(prev => [...prev, noteData]);
      } else {
        setNotes(prev => [...prev, noteData]);
      }
      
      // Send via WebSocket for real-time updates (but don't add to local state again)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'note',
          ...noteData,
          skipLocalAdd: true // Flag to prevent duplicate addition
        }));
      }
      
      // Always send to backend (it will handle routing to notes or feedback)
      console.log('Saving to backend...');
      try {
        const response = await fetch(`http://localhost:5000/api/candidate/${candidateId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(noteData),
        });
        
        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
        }
        
        let savedNote;
        try {
          savedNote = JSON.parse(responseText);
          console.log('Note saved successfully:', savedNote);
          
          // Update the temporary message with the server response
          setAllMessages(prev => prev.map(msg => 
            msg.tempId === tempId ? { ...savedNote, messageType: shouldSave ? 'feedback' : 'note' } : msg
          ));
          
          if (shouldSave) {
            setFeedback(prev => prev.map(fb => 
              fb.tempId === tempId ? savedNote : fb
            ));
          } else {
            setNotes(prev => prev.map(note => 
              note.tempId === tempId ? savedNote : note
            ));
          }
          
          // Trigger sentiment analysis callback only for saved feedback notes
          if (shouldSave && onNoteSaved && typeof onNoteSaved === 'function') {
            onNoteSaved();
          }
        } catch (e) {
          console.error('Error parsing success response:', e);
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Error saving note:', error);
        // Remove the note from local state if save failed
        setAllMessages(prev => prev.filter(msg => msg.tempId !== tempId));
        if (shouldSave) {
          setFeedback(prev => prev.filter(fb => fb.tempId !== tempId));
        } else {
          setNotes(prev => prev.filter(note => note.tempId !== tempId));
        }
        alert('Failed to save note: ' + error.message);
      }
      
      setNewNote('');
    } catch (error) {
      console.error('Error handling note:', error);
    }
  };

  const handleTyping = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        interviewer: 'Current User'
      }));
    }
  };

  return (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
      {/* Header */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          bgcolor: 'white',
          borderBottom: '1px solid #e9ecef',
          borderRadius: 0
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <GroupsIcon sx={{ mr: 2, color: '#0C3F05' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#343a40' }}>
                Interview Discussion
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d' }}>
                Collaborate with your team on candidate evaluation
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Chip
              icon={<CircleIcon sx={{ fontSize: 8 }} />}
              label={isConnected ? "Online" : "Offline"}
              size="small"
              color={isConnected ? "success" : "warning"}
              variant="outlined"
            />
            <Badge badgeContent={allMessages.length} color="primary">
              <Avatar sx={{ bgcolor: '#0C3F05', width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            </Badge>
          </Stack>
        </Stack>
      </Paper>

      {/* Chat Messages Area */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2,
          bgcolor: '#f8f9fa',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#c1c1c1',
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: '#a8a8a8',
            },
          },
        }}
      >
        {allMessages.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            height="100%"
            sx={{ opacity: 0.6 }}
          >
            <GroupsIcon sx={{ fontSize: 64, color: '#6c757d', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#6c757d', mb: 1 }}>
              Start the conversation
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d', textAlign: 'center' }}>
              Share your thoughts and feedback about this candidate with your team
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {allMessages.map((message, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: message.isSaved ? '#0C3F05' : '#6c757d',
                    width: 40, 
                    height: 40,
                    fontSize: '14px'
                  }}
                >
                  {message.interviewer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#343a40' }}>
                      {message.interviewer.name}
                    </Typography>
                    <TimeIcon sx={{ fontSize: 12, color: '#6c757d' }} />
                    <Typography variant="caption" sx={{ color: '#6c757d' }}>
                      {new Date(message.timestamp?.seconds ? message.timestamp.seconds * 1000 : message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    {message.isSaved && (
                      <Chip 
                        label="Saved Feedback" 
                        size="small" 
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: '10px', height: '18px' }}
                      />
                    )}
                  </Box>
                  <Card 
                    elevation={1}
                    sx={{ 
                      bgcolor: message.isSaved ? '#e8f5e8' : 'white',
                      border: message.isSaved ? '1px solid #0C3F05' : '1px solid #e9ecef',
                      borderRadius: 2,
                      maxWidth: '85%'
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="body1" sx={{ 
                        color: '#343a40', 
                        lineHeight: 1.5,
                        wordBreak: 'break-word'
                      }}>
                        {message.content}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            ))}
            {isTyping && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 7 }}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 0.5,
                  p: 1,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid #e9ecef'
                }}>
                  <Box sx={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    bgcolor: '#6c757d',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  <Box sx={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    bgcolor: '#6c757d',
                    animation: 'pulse 1.5s infinite 0.5s'
                  }} />
                  <Box sx={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    bgcolor: '#6c757d',
                    animation: 'pulse 1.5s infinite 1s'
                  }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#6c757d' }}>
                  Someone is typing...
                </Typography>
              </Box>
            )}
          </Stack>
        )}
        <div ref={notesEndRef} />
      </Box>

      {/* Input Area */}
      <Paper 
        elevation={3}
        sx={{ 
          p: 2, 
          bgcolor: 'white',
          borderTop: '1px solid #e9ecef',
          borderRadius: 0
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-end">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Share your thoughts about this candidate..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyUp={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendNote(false);
              }
            }}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#f8f9fa',
                '& fieldset': {
                  borderColor: '#e9ecef',
                },
                '&:hover fieldset': {
                  borderColor: '#0C3F05',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#0C3F05',
                },
              },
            }}
          />
          <Stack direction="row" spacing={1}>
            <IconButton 
              onClick={() => handleSendNote(false)}
              disabled={!newNote.trim()}
              sx={{
                bgcolor: '#f8f9fa',
                color: '#6c757d',
                borderRadius: 2.5,
                border: '1px solid #e9ecef',
                width: 44,
                height: 44,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: '#e9ecef',
                  color: '#0C3F05',
                  border: '1px solid #0C3F05',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(12, 63, 5, 0.15)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 1px 4px rgba(12, 63, 5, 0.1)',
                },
                '&:disabled': {
                  bgcolor: '#f8f9fa',
                  color: '#ced4da',
                  border: '1px solid #e9ecef',
                  transform: 'none',
                  boxShadow: 'none',
                },
              }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Button
              variant="contained"
              onClick={() => handleSendNote(true)}
              disabled={!newNote.trim()}
              sx={{
                bgcolor: '#0C3F05',
                color: 'white',
                borderRadius: 3,
                px: 2.5,
                py: 1,
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                minWidth: 'auto',
                boxShadow: '0 2px 8px rgba(12, 63, 5, 0.2)',
                border: '1px solid transparent',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: '#0a3604',
                  boxShadow: '0 4px 12px rgba(12, 63, 5, 0.3)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 6px rgba(12, 63, 5, 0.2)',
                },
                '&:disabled': {
                  bgcolor: '#f8f9fa',
                  color: '#ced4da',
                  boxShadow: 'none',
                  transform: 'none',
                  border: '1px solid #e9ecef',
                },
              }}
              startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
            >
              Save
            </Button>
          </Stack>
        </Stack>
        <Typography variant="caption" sx={{ color: '#6c757d', mt: 1, display: 'block' }}>
          Press Enter to send a quick message, or click "Save" to add feedback to candidate record
        </Typography>
      </Paper>
    </Box>
  );
};

export default NotesHub;
