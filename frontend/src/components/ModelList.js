import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Box, 
    Typography, 
    Paper, 
    List, 
    ListItem, 
    ListItemText,
    CircularProgress,
    Alert
} from '@mui/material';

const ModelList = () => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/models');
                setModels(response.data.models);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching models:', error);
                setError(error.message);
                setLoading(false);
            }
        };

        fetchModels();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" m={3}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box m={3}>
                <Alert severity="error">Error loading models: {error}</Alert>
            </Box>
        );
    }

    return (
        <Box m={3}>
            <Typography variant="h4" gutterBottom>
                Available Gemini Models
            </Typography>
            <List>
                {models.map((model, index) => (
                    <Paper key={index} elevation={2} sx={{ mb: 2, p: 2 }}>
                        <ListItem>
                            <ListItemText
                                primary={model.name}
                                secondary={
                                    <>
                                        <Typography component="span" variant="body2" color="text.primary">
                                            Description: {model.description}
                                        </Typography>
                                        <br />
                                        <Typography component="span" variant="body2">
                                            Supported Methods:
                                            <ul>
                                                {model.generation_methods.map((method, idx) => (
                                                    <li key={idx}>{method}</li>
                                                ))}
                                            </ul>
                                        </Typography>
                                    </>
                                }
                            />
                        </ListItem>
                    </Paper>
                ))}
            </List>
        </Box>
    );
};

export default ModelList;
