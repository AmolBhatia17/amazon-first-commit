import React, { useState } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { submitSupportRequest } from '../../utils/supportForm';

import * as CP from '../ui/ContentPage';

/* Amber Paper content-page kit (see ../ui/ContentPage). */
const Page = CP.Shell;
const Container = CP.Wrap;
const Title = CP.Title;
const Subtitle = CP.Subtitle;
const CardGrid = CP.Grid;
const Card = CP.GridCard;
const CardTitle = CP.CardTitle;
const CardText = CP.CardText;
const Form = CP.Form;
const Row = CP.Row;
const Label = CP.Label;
const Input = CP.Input;
const Textarea = CP.Textarea;
const Submit = CP.Submit;
const Success = CP.SuccessBox;
const Error = CP.ErrorBox;

function Help() {
  const [type, setType] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState('idle');

  const preset = (t) => { setType(t); if (!subject) setSubject(t.replace(/\b\w/g, c => c.toUpperCase())); };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    const result = await submitSupportRequest({ type, subject, message, contact });
    if (result.ok) {
      setStatus('success');
      setSubject(''); setMessage(''); setContact('');
    } else {
      setStatus('error');
    }
  };

  return (
    <Page>
      <Header logo="Unitalks" hasSidebar={false} />
      <Container>
        <Title>Help Center</Title>
        <Subtitle>How can we help? Choose a category or write to us.</Subtitle>

        <CardGrid>
          <Card onClick={() => preset('bug')}>
            <CardTitle>Report a Bug</CardTitle>
            <CardText>Something broken? Tell us what went wrong.</CardText>
          </Card>
          <Card onClick={() => preset('feature')}>
            <CardTitle>Feature Suggestion</CardTitle>
            <CardText>Have an idea? Share what would make Unitalks better.</CardText>
          </Card>
          <Card onClick={() => preset('work-with-us')}>
            <CardTitle>Work With Us</CardTitle>
            <CardText>Collaborations, careers, campuses — we're listening.</CardText>
          </Card>
          <Card onClick={() => preset('advertise')}>
            <CardTitle>Advertise With Us</CardTitle>
            <CardText>Reach college audiences the right way.</CardText>
          </Card>
        </CardGrid>

        <Form onSubmit={onSubmit}>
          <Row>
            <div>
              <Label>Topic</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} list="topics" />
              <datalist id="topics">
                <option value="bug" />
                <option value="feature" />
                <option value="work-with-us" />
                <option value="advertise" />
              </datalist>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" />
            </div>
          </Row>
          <div style={{ marginTop: 12 }}>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue or request" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Label>Contact (optional)</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone so we can reply" />
          </div>
          <Submit type="submit" disabled={status==='loading'}>{status==='loading' ? 'Sending…' : 'Send'}</Submit>
          {status==='success' && <Success>Thanks! We'll get back to you soon.</Success>}
          {status==='error' && <Error>Couldn't send. Please try again.</Error>}
        </Form>

      </Container>
      <Footer />
    </Page>
  );
}

export default Help;
