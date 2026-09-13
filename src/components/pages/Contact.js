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
const Form = CP.Form;
const Row = CP.Row;
const Label = CP.Label;
const Input = CP.Input;
const Textarea = CP.Textarea;
const Submit = CP.Submit;
const Success = CP.SuccessBox;
const Error = CP.ErrorBox;

function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const subject = 'Contact';
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    const result = await submitSupportRequest({
      type: 'contact',
      subject,
      message,
      contact: email,
      name,
    });
    if (result.ok) {
      setStatus('success');
      setName(''); setEmail(''); setMessage('');
    } else {
      setStatus('error');
    }
  };

  return (
    <Page>
      <Header logo="Unitalks" hasSidebar={false} />
      <Container>
        <Title>Contact Us</Title>
        <Subtitle>We usually reply within 1-2 business days.</Subtitle>
        <Form onSubmit={onSubmit}>
          <Row>
            <div>
              <Label>Your Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Your Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </Row>
          <div style={{ marginTop: 12 }}>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" required />
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

export default Contact;
