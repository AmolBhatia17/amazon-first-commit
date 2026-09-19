import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { FiHelpCircle, FiZap, FiRefreshCw, FiCheck } from 'react-icons/fi';

/* ── Truth and Dare ──────────────────────────────────────────────────── */

const TRUTHS = [
  'What is the most embarrassing thing you have ever searched for online?',
  'What is a small lie you told recently and got away with?',
  'Who was your first crush, and what gave it away?',
  'What is the pettiest reason you have ever stopped talking to someone?',
  'What is something you pretend to enjoy but secretly do not?',
  'What is the worst haircut you have ever had?',
  'What is a talent you wish you had but absolutely do not?',
  'What is the longest you have gone without sleep, and why?',
  'What song do you play on repeat when nobody is around?',
  'What is the most childish thing you still do?',
  'What is the biggest risk you have ever taken?',
  'What compliment do you get most often, and do you believe it?',
  'What is something you spent money on and instantly regretted?',
  'What is the worst advice you have ever given someone?',
  'What is a rumour you once believed for way too long?',
  'If you could undo one text message you sent, which one would it be?',
  'What is the strangest thing you have ever eaten?',
  'What is something you are weirdly competitive about?',
  'Who in your life would you swap places with for a week?',
  'What is the most useless fact you know by heart?',
];

const DARES = [
  'Speak in a movie-trailer voice until your next turn.',
  'Do your best impression of the person you are talking to.',
  'Sing the chorus of the last song you listened to.',
  'Let the other person pick your next message and type it exactly.',
  'Describe the last photo in your camera roll without showing it.',
  'Talk without using the letter E until your next turn.',
  'Do ten jumping jacks right now.',
  'Say a tongue twister three times fast without messing up.',
  'Pretend to be a news anchor and report on what you did today.',
  'Give a thirty-second review of the room you are sitting in.',
  'Do your best evil-villain laugh.',
  'Let the other person give you a nickname to use until your next turn.',
  'Describe your morning in one long sentence with no pauses.',
  'Hold your best superhero pose for fifteen seconds.',
  'Tell a joke, and if nobody laughs, tell another one.',
  'Narrate your next thirty seconds like a nature documentary.',
  'Count backwards from fifty by sevens out loud.',
  'Do an accent of the other player choosing until your next turn.',
  'Whisper everything you say until your next turn.',
  'Read the last thing you typed today in a dramatic voice.',
];

const Wrap = styled.div`
  padding: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.paperAlt};
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 58%;
  overflow-y: auto;
`;

const TurnBanner = styled.div`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.muted};
  text-align: center;
`;

const ChoiceRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
`;

const ChoiceButton = styled.button`
  flex: 1;
  max-width: 190px;
  height: 52px;
  border-radius: ${({ theme }) => theme.radii.control};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.blockSm};
  transition: transform 0.12s ease, background 0.15s ease;

  &:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  &.dare {
    background: ${({ theme }) => theme.colors.ink};
    color: ${({ theme }) => theme.colors.paper};
  }
`;

const PromptCard = styled.div`
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  background: ${({ theme }) => theme.colors.paper};
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PromptKind = styled.div`
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: 3px 10px;
  align-self: flex-start;
`;

const PromptText = styled.div`
  font-size: 15.5px;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.ink};
`;

const PromptWho = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.muted};
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  height: 42px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radii.control};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 13.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:active:not(:disabled) { transform: scale(0.96); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  &.primary {
    background: ${({ theme }) => theme.colors.ink};
    color: ${({ theme }) => theme.colors.paper};
  }
`;

const pickIndex = (len, usedRef) => {
  if (usedRef.current.size >= len) usedRef.current.clear();
  let i = Math.floor(Math.random() * len);
  let guard = 0;
  while (usedRef.current.has(i) && guard < len * 3) {
    i = Math.floor(Math.random() * len);
    guard += 1;
  }
  usedRef.current.add(i);
  return i;
};

/**
 * Turn-based Truth and Dare. Whoever sent the invite picks first.
 * Every move travels over the existing peer data channel as
 * { type: 'truth-dare', ... } so both sides render the same card.
 */
const TruthDare = ({ isFirstPicker, incoming, sendData }) => {
  const [myTurn, setMyTurn] = useState(!!isFirstPicker);
  const [card, setCard] = useState(null); // { kind, text, byMe }
  const usedTruths = useRef(new Set());
  const usedDares = useRef(new Set());

  // Mirror whatever the partner just did.
  useEffect(() => {
    if (!incoming || incoming.type !== 'truth-dare') return;
    if (incoming.action === 'pick') {
      setCard({ kind: incoming.kind, text: incoming.text, byMe: false });
      setMyTurn(false);
    } else if (incoming.action === 'pass') {
      setCard(null);
      setMyTurn(true);
    }
  }, [incoming]);

  const pick = (kind) => {
    const bank = kind === 'truth' ? TRUTHS : DARES;
    const usedRef = kind === 'truth' ? usedTruths : usedDares;
    const text = bank[pickIndex(bank.length, usedRef)];
    setCard({ kind, text, byMe: true });
    sendData({ type: 'truth-dare', action: 'pick', kind, text });
  };

  const pass = () => {
    setCard(null);
    setMyTurn(false);
    sendData({ type: 'truth-dare', action: 'pass' });
  };

  return (
    <Wrap>
      {!card && (
        <>
          <TurnBanner>
            {myTurn ? 'Your turn — pick one' : 'Waiting for the stranger to pick…'}
          </TurnBanner>
          <ChoiceRow>
            <ChoiceButton disabled={!myTurn} onClick={() => pick('truth')}>
              <FiHelpCircle size={18} /> Truth
            </ChoiceButton>
            <ChoiceButton className="dare" disabled={!myTurn} onClick={() => pick('dare')}>
              <FiZap size={18} /> Dare
            </ChoiceButton>
          </ChoiceRow>
        </>
      )}

      {card && (
        <>
          <PromptCard>
            <PromptKind>{card.kind === 'truth' ? 'Truth' : 'Dare'}</PromptKind>
            <PromptText>{card.text}</PromptText>
            <PromptWho>
              {card.byMe
                ? 'You picked this one — answer it, then pass the turn.'
                : 'The stranger picked this one. You are up next.'}
            </PromptWho>
          </PromptCard>
          {card.byMe && (
            <ActionRow>
              <ActionButton onClick={() => pick(card.kind)}>
                <FiRefreshCw size={15} /> Another one
              </ActionButton>
              <ActionButton className="primary" onClick={pass}>
                <FiCheck size={15} /> Done — their turn
              </ActionButton>
            </ActionRow>
          )}
        </>
      )}
    </Wrap>
  );
};

export default TruthDare;
