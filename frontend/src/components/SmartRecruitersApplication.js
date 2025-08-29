import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Paper
} from '@mui/material';
import { Send, CheckCircle, Error, Info } from '@mui/icons-material';
import axiosInstance from '../api/axiosInstance';

const SmartRecruitersApplication = ({ jobId, postingUuid, candidateData, onSubmissionComplete }) => {
  const [configuration, setConfiguration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [answers, setAnswers] = useState({});
  const [consentDecisions, setConsentDecisions] = useState({});

  useEffect(() => {
    if (postingUuid) {
      fetchConfiguration();
    }
  }, [postingUuid]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(
        `/api/smartrecruiters/posting/${postingUuid}/config`
      );

      if (response.data.success) {
        setConfiguration(response.data.configuration);
        initializeAnswers(response.data.configuration.questions);
        initializeConsent(response.data.configuration.consentSettings);
      } else {
        throw new Error('Failed to load application configuration');
      }
    } catch (err) {
      console.error('Error fetching SmartRecruiters configuration:', err);
      setError(err.response?.data?.error || 'Failed to load application form');
    } finally {
      setLoading(false);
    }
  };

  const initializeAnswers = (questions) => {
    const initialAnswers = {};
    questions.forEach(question => {
      question.fields.forEach(field => {
        initialAnswers[`${question.id}_${field.id}`] = '';
      });
    });
    setAnswers(initialAnswers);
  };

  const initializeConsent = (consentSettings) => {
    const initialConsent = {};
    if (consentSettings?.scopes) {
      consentSettings.scopes.forEach(scope => {
        initialConsent[scope.scope] = scope.required;
      });
    }
    setConsentDecisions(initialConsent);
  };

  const handleAnswerChange = (questionId, fieldId, value) => {
    const key = `${questionId}_${fieldId}`;
    setAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleConsentChange = (scope, value) => {
    setConsentDecisions(prev => ({
      ...prev,
      [scope]: value
    }));
  };

  const validateForm = () => {
    if (!configuration) return false;

    // Check required screening questions
    for (const question of configuration.questions) {
      for (const field of question.fields) {
        if (field.required) {
          const key = `${question.id}_${field.id}`;
          if (!answers[key] || answers[key].length === 0) {
            setError(`Please answer: ${field.label}`);
            return false;
          }
        }
      }
    }

    // Check required consent
    if (configuration.consentSettings?.scopes) {
      for (const scope of configuration.consentSettings.scopes) {
        if (scope.required && !consentDecisions[scope.scope]) {
          setError(`Please provide required consent: ${scope.label}`);
          return false;
        }
      }
    }

    return true;
  };

  const formatAnswersForSubmission = () => {
    const formattedAnswers = [];
    
    if (!configuration?.questions) return formattedAnswers;

    configuration.questions.forEach(question => {
      const questionAnswers = {
        id: question.id,
        records: []
      };

      const fields = {};
      question.fields.forEach(field => {
        const key = `${question.id}_${field.id}`;
        const value = answers[key];
        if (value) {
          fields[field.id] = Array.isArray(value) ? value : [value];
        }
      });

      if (Object.keys(fields).length > 0) {
        questionAnswers.records.push({ fields });
        formattedAnswers.push(questionAnswers);
      }
    });

    return formattedAnswers;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      const applicationData = {
        ...candidateData,
        screening_answers: formatAnswersForSubmission(),
        consent_decisions: consentDecisions
      };

      const response = await axiosInstance.post(
        `/api/smartrecruiters/posting/${postingUuid}/apply`,
        applicationData
      );

      if (response.data.success) {
        setSuccess(true);
        if (onSubmissionComplete) {
          onSubmissionComplete(response.data.smartrecruiters_response);
        }
      } else {
        throw new Error('Application submission failed');
      }
    } catch (err) {
      console.error('Error submitting application:', err);
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (question, field) => {
    const key = `${question.id}_${field.id}`;
    const value = answers[key] || '';

    switch (field.type) {
      case 'INPUT_TEXT':
        return (
          <TextField
            key={key}
            fullWidth
            label={field.label}
            required={field.required}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, field.id, e.target.value)}
            margin="normal"
          />
        );

      case 'TEXTAREA':
        return (
          <TextField
            key={key}
            fullWidth
            multiline
            rows={4}
            label={field.label}
            required={field.required}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, field.id, e.target.value)}
            margin="normal"
          />
        );

      case 'SINGLE_SELECT':
      case 'RADIO':
        return (
          <FormControl key={key} fullWidth margin="normal" required={field.required}>
            <FormLabel>{field.label}</FormLabel>
            <RadioGroup
              value={value}
              onChange={(e) => handleAnswerChange(question.id, field.id, e.target.value)}
            >
              {field.values.map(option => (
                <FormControlLabel
                  key={option.id}
                  value={option.id}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'MULTI_SELECT':
        return (
          <FormControl key={key} fullWidth margin="normal" required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => handleAnswerChange(question.id, field.id, e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((val) => {
                    const option = field.values.find(opt => opt.id === val);
                    return <Chip key={val} label={option?.label || val} size="small" />;
                  })}
                </Box>
              )}
            >
              {field.values.map(option => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'CHECKBOX':
        return (
          <FormControl key={key} component="fieldset" margin="normal" required={field.required}>
            <FormLabel component="legend">{field.label}</FormLabel>
            <FormGroup>
              {field.values.map(option => (
                <FormControlLabel
                  key={option.id}
                  control={
                    <Checkbox
                      checked={(Array.isArray(value) ? value : []).includes(option.id)}
                      onChange={(e) => {
                        const currentValues = Array.isArray(value) ? value : [];
                        const newValues = e.target.checked
                          ? [...currentValues, option.id]
                          : currentValues.filter(v => v !== option.id);
                        handleAnswerChange(question.id, field.id, newValues);
                      }}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </FormControl>
        );

      case 'INFORMATION':
        return (
          <Alert key={key} severity="info" sx={{ my: 2 }}>
            <Typography>{field.label}</Typography>
          </Alert>
        );

      default:
        return (
          <TextField
            key={key}
            fullWidth
            label={field.label}
            required={field.required}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, field.id, e.target.value)}
            margin="normal"
          />
        );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading application form...</Typography>
      </Box>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Application Submitted Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your application has been submitted to SmartRecruiters. 
            You should receive a confirmation email shortly.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Apply via SmartRecruiters
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {configuration && (
          <>
            {/* Screening Questions */}
            {configuration.questions && configuration.questions.length > 0 && (
              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Application Questions
                </Typography>
                {configuration.questions.map(question => (
                  <Box key={question.id} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {question.label}
                    </Typography>
                    {question.fields.map(field => renderField(question, field))}
                  </Box>
                ))}
              </Paper>
            )}

            {/* Privacy Policies */}
            {configuration.privacyPolicies && configuration.privacyPolicies.length > 0 && (
              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Privacy Policies
                </Typography>
                {configuration.privacyPolicies.map((policy, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    <a href={policy.url} target="_blank" rel="noopener noreferrer">
                      {policy.orgName} Privacy Policy
                    </a>
                  </Typography>
                ))}
              </Paper>
            )}

            {/* Consent Settings */}
            {configuration.consentSettings?.scopes && (
              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Consent & Permissions
                </Typography>
                {configuration.consentSettings.scopes.map(scope => (
                  <FormControlLabel
                    key={scope.scope}
                    control={
                      <Checkbox
                        checked={consentDecisions[scope.scope] || false}
                        onChange={(e) => handleConsentChange(scope.scope, e.target.checked)}
                        required={scope.required}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">
                          {scope.label}
                          {scope.required && <span style={{ color: 'red' }}> *</span>}
                        </Typography>
                      </Box>
                    }
                    sx={{ display: 'block', mb: 1 }}
                  />
                ))}
              </Paper>
            )}

            <Divider sx={{ my: 3 }} />

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartRecruitersApplication;
