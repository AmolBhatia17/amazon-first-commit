import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(28, 28, 30, 0.55);

  @media (max-width: 560px) { align-items: flex-end; padding: 0; }
`;

const popUp = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Card = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 26px;
  box-shadow: 0 5px 0 ${({ theme }) => theme.colors.ink};
  animation: ${popUp} 0.26s cubic-bezier(0.34, 1.4, 0.64, 1);
  max-height: 90vh;
  overflow-y: auto;

  @media (max-width: 560px) {
    max-width: 100%;
    border-radius: ${({ theme }) => theme.radii.card} ${({ theme }) => theme.radii.card} 0 0;
    border-bottom: none;
    box-shadow: none;
    padding: 22px 18px calc(22px + env(safe-area-inset-bottom));
  }
`;

const Title = styled.h3`
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 6px;
`;

const Desc = styled.p`
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.muted};
  margin: 0 0 20px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 14px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.ink};
`;

const Input = styled.input`
  display: block;
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 15px;
  font-weight: 500;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.ink};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.sun};
  }
`;

const Textarea = styled.textarea`
  display: block;
  width: 100%;
  min-height: 118px;
  resize: vertical;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  font-family: inherit;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.ink};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.sun};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;

  > * { flex: 1; }
`;

const Button = styled.button`
  height: 52px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radii.control};
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  transition: transform 0.12s ease, background 0.15s ease;

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.sunTint}; }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Primary = styled(Button)`
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  border-color: ${({ theme }) => theme.colors.ink};

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.inkSoft}; }
`;

const SuccessNote = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.sunDeep};
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
`;

const ErrorNote = styled(SuccessNote)`
  background: ${({ theme }) => theme.colors.red};
  border-color: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
`;

const ReportBugModal = ({ onClose }) => {
  const [page, setPage] = useState(typeof window !== 'undefined' ? window.location.pathname : '');
  const [email, setEmail] = useState('');
  const [bug, setBug] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittedRef = useRef(false);

  const WEB3FORMS_KEY = process.env.REACT_APP_WEB3FORMS_KEY || 'a932dd6c-756e-4564-a810-3088ac0b722b';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!WEB3FORMS_KEY) {
      setError('Missing Web3Forms key. Please set REACT_APP_WEB3FORMS_KEY in .env');
      return;
    }
    setSubmitting(true);
    submittedRef.current = true;
    try {
      const payload = {
        access_key: WEB3FORMS_KEY,
        subject: 'Bug Report / Feature Request',
        from_name: 'Unitalks Bug Reporter',
        replyto: email || undefined,
        page,
        bug,
        suggestions,
        url: typeof window !== 'undefined' ? window.location.href : '',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      };
      // Remove undefined keys
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.success) {
        setSubmitted(true);
      } else {
        setError(data?.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setSubmitting(false);
      submittedRef.current = false;
    }
  };

  const modalContent = (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Title>Report a Bug / Request a Feature</Title>
        <Desc>Help us improve. Tell us where you saw the issue and what happened.</Desc>

        <form onSubmit={handleSubmit}>
          <Row>
            <Label>Bug appeared on which page</Label>
            <Input value={page} onChange={(e) => setPage(e.target.value)} placeholder="/video, /voice, /text, or page name" required />
          </Row>
          <Row>
            <Label>Your email (optional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Row>
          <Row>
            <Label>Bug details</Label>
            <Textarea value={bug} onChange={(e) => setBug(e.target.value)} placeholder="Describe the bug in detail" required />
          </Row>
          <Row>
            <Label>Request Features / Suggestions</Label>
            <Textarea value={suggestions} onChange={(e) => setSuggestions(e.target.value)} placeholder="Share feature ideas or suggestions" />
          </Row>
          <Actions>
            <Button type="button" onClick={onClose}>Close</Button>
            <Primary type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Primary>
          </Actions>
        </form>

        {error && <ErrorNote>{error}</ErrorNote>}
        {submitted && (
          <SuccessNote>
            Thank you! We received your report/suggestions. We'll review it and prioritize your requested features.
          </SuccessNote>
        )}
      </Card>
    </Overlay>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default ReportBugModal;
