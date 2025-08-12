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
  Chip,
  Popper,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  ClickAwayListener,
} from '@mui/material';
import { 
  Send as SendIcon, 
  Save as SaveIcon,
  Groups as GroupsIcon,
  Circle as CircleIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { db, collection, getDocs } from '../firebase';
import axiosInstance from '../api/axiosInstance';
const NotesHub = ({ candidateId, candidateName, onNoteSaved }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const wsRef = useRef(null);
  const notesEndRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const maxReconnectAttempts = 3;
  const typingTimeouts = useRef({});
  const [users, setUsers] = useState([]);
  const [mentionState, setMentionState] = useState({ anchorEl: null, suggestions: [], query: '' });
  // Use a callback ref to get the textarea DOM node
  const textareaRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = React.useCallback(() => {
    notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch all users for @mentions
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users for mentions:", error);
      }
    };
    fetchUsers();
  }, []);

  const fetchNotes = React.useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/api/candidate/${candidateId}/notes`);
      if (response.status === 200) {
        const data = response.data;
        setNotes(data.notes || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, [candidateId, scrollToBottom]);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000/ws/notes');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      ws.send(JSON.stringify({ type: 'init', candidateId: candidateId }));
      ws.pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));

      switch (data.type) {
        case 'note':
          setNotes(prev => [...prev, data.note]);
          setTimeout(scrollToBottom, 0);
          break;
        case 'typing':
          if (data.interviewer && data.interviewer.name !== currentUser?.name) {
            setTypingUsers(prev => ({ ...prev, [data.interviewer.name]: true }));
            if (typingTimeouts.current[data.interviewer.name]) {
              clearTimeout(typingTimeouts.current[data.interviewer.name]);
            }
            typingTimeouts.current[data.interviewer.name] = setTimeout(() => {
              setTypingUsers(prev => {
                const updated = { ...prev };
                delete updated[data.interviewer.name];
                return updated;
              }, 2000);
            }, 2000);
          }
          break;
        default:
          break;
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (ws.pingInterval) {
        clearInterval(ws.pingInterval);
      }
      // A robust auto-reconnect strategy is complex.
      // For now, we will simply log the closure and prevent faulty reconnect attempts.
      console.log('WebSocket connection closed.');
    };

    fetchNotes();

    // Cleanup on unmount
    return () => {
      if (ws.pingInterval) {
        clearInterval(ws.pingInterval);
      }
      ws.close();
    };
  }, [candidateId, fetchNotes, scrollToBottom]);

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNewNote(value);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    // Find the last @ and get the first two words after it (for mention suggestions)
    const atMatch = textBeforeCursor.match(/@([^@\n]*)$/);
    let mentionQuery = '';
    let showPopper = false;
    if (atMatch) {
      // Only use the first two words after @
      const afterAt = atMatch[1];
      const words = afterAt.trim().split(/\s+/);
      // Only show popper if cursor is still within the mention (not after two words)
      if (words.length <= 2) {
        mentionQuery = words.join(' ').toLowerCase();
        showPopper = true;
      }
    }
    if (showPopper && mentionQuery.length > 0) {
      // Suggest users whose name starts with or contains the query (case-insensitive, ignore spaces)
      const suggestions = users.filter(user => {
        const userName = user.name ? user.name.toLowerCase() : '';
        return userName.replace(/\s+/g, '').includes(mentionQuery.replace(/\s+/g, ''));
      });
      setMentionState({
        anchorEl: inputRef.current,
        suggestions: suggestions.slice(0, 5), // Limit suggestions
        query: mentionQuery
      });
    } else {
      setMentionState({ anchorEl: null, suggestions: [], query: '' });
    }
  };

  const handleMentionSelect = (user) => {
    const currentText = newNote;
    let cursorPosition = null;
    if (textareaRef.current && typeof textareaRef.current.selectionStart === 'number') {
      cursorPosition = textareaRef.current.selectionStart;
    }
    let newText;
    if (cursorPosition !== null) {
      const textBeforeCursor = currentText.substring(0, cursorPosition);
      // Replace the last @mentionQuery with the selected user name
      const replaced = textBeforeCursor.replace(/@([^@\n]*)$/, `@${user.name} `);
      const textAfterMention = currentText.substring(cursorPosition);
      newText = replaced + textAfterMention;
    } else {
      // fallback: append at end
      newText = `${currentText}@${user.name} `;
    }
    setNewNote(newText);
    setMentionState({ anchorEl: null, suggestions: [], query: '' });
    // Focus the textarea after selection
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 0);
  };

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

    // --- Notification logic for @mentions ---
    // Find all @mentions in the note (case-insensitive, only match exact user names, only first two words after @)
    const mentionRegex = /@([A-Za-z0-9_\- ]{1,})/g;
    let match;
    const mentionedNames = [];
    while ((match = mentionRegex.exec(newNote)) !== null) {
      // Only take the first two words after @ as the name
      const name = match[1].trim().split(/\s+/).slice(0,2).join(' ');
      if (name && !mentionedNames.some(n => n.toLowerCase() === name.toLowerCase())) mentionedNames.push(name);
    }
    // For each mentioned user, create a notification in Firestore (case-insensitive, exact match)
    if (mentionedNames.length > 0) {
      // Find user objects for mentioned names (case-insensitive, exact match)
      const mentionedUsers = users.filter(u =>
        u.name && mentionedNames.some(n => u.name.trim().toLowerCase() === n.trim().toLowerCase())
      );
      if (!window.firebase || !window.firebase.firestore) {
        console.error('window.firebase or window.firebase.firestore is not available!');
      }
      for (const user of mentionedUsers) {
        try {
          // notifications/{userId}/items/{autoId}
          const notifRef = window.firebase.firestore()
            .collection('notifications')
            .doc(user.id)
            .collection('items');
          const notifData = {
            type: 'mention',
            message: `${currentUser?.name || 'Someone'} mentioned you in a note about ${candidateName || 'a candidate'}.`,
            candidateId,
            candidateName,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            from: currentUser?.name || 'Unknown',
            noteContent: newNote
          };
          const notifResult = await notifRef.add(notifData);
          console.log('Notification created for user', user.name, 'with id', notifResult.id, notifData);
        } catch (err) {
          console.error('Failed to create notification for', user.name, err);
        }
      }
    }
    // --- End notification logic ---

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
        console.log('Saving note to database...');
        console.log('Request data:', noteData);
        try {
          const response = await axiosInstance.post(`/api/candidate/${candidateId}/notes`, noteData);
          console.log('Response status:', response.status);
          console.log('Raw response:', response.data);
          if (response.status !== 201) {
            let errorData;
            try {
              errorData = response.data;
            } catch (e) {
              errorData = { error: 'Unknown error' };
            }
            console.error('Server error:', errorData);
            throw new Error(errorData.error || 'Failed to save note');
          }
          let savedNote;
          try {
            savedNote = response.data;
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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        interviewer: { name: currentUser.name, avatar: currentUser.avatar }
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
        {Object.keys(typingUsers).length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 7, mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {`${Object.keys(typingUsers).join(', ')} ${Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...`}
            </Typography>
          </Box>
        )}
        <div ref={notesEndRef} />
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Popper
          open={Boolean(mentionState.anchorEl)}
          anchorEl={mentionState.anchorEl}
          placement="top-start"
          sx={{ zIndex: 1300, mb: 1 }}
        >
          <Paper elevation={3}>
            <ClickAwayListener onClickAway={() => setMentionState({ ...mentionState, anchorEl: null })}>
              <MenuList autoFocusItem={Boolean(mentionState.anchorEl)} id="mention-menu-list">
                {mentionState.suggestions.length > 0 ? (
                  mentionState.suggestions.map(user => (
                    <MenuItem key={user.id} onClick={() => handleMentionSelect(user)}>
                      <ListItemIcon>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{user.name[0]}</Avatar>
                      </ListItemIcon>
                      <ListItemText>{user.name}</ListItemText>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No users found matching "@{mentionState.query}"</MenuItem>
                )}
              </MenuList>
            </ClickAwayListener>
          </Paper>
        </Popper>
        <Stack direction="row" spacing={1}>
          <TextField
            inputRef={textareaRef}
            ref={inputRef}
            fullWidth
            variant="outlined"
            placeholder="Write your notes here..."
            value={newNote}
            onChange={handleNoteChange}
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
