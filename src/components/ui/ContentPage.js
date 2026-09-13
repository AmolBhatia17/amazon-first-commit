import styled from 'styled-components';

/**
 * Amber Paper content-page kit.
 *
 * Shared primitives for the long-form / form pages (About, Privacy, Terms,
 * Help, Contact) so they all read as one system: amber canvas, white paper
 * slate, ink headings, flat fills and crisp 1.5px outlines.
 */

export const Shell = styled.div`
  width: 100%;
  min-height: 100vh;
  padding-top: 72px;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) { padding-top: 60px; }
`;

export const Wrap = styled.div`
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: 40px 24px 32px;
  flex: 1;

  @media (max-width: 768px) { padding: 26px 16px 24px; }
`;

/**
 * Long-form wrapper that IS the white paper slate - for pages whose body copy
 * would otherwise sit straight on the amber canvas (Privacy, Terms).
 */
export const Sheet = styled.div`
  width: 100%;
  max-width: 980px;
  margin: 0 auto 32px;
  padding: 36px 40px 40px;
  flex: 1;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};

  @media (max-width: 1040px) { margin: 0 24px 24px; width: auto; }
  @media (max-width: 768px) {
    margin: 0 16px 20px;
    padding: 24px 20px 28px;
    border-radius: ${({ theme }) => theme.radii.panel};
  }
`;

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 34px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    padding: 22px 18px;
    border-radius: ${({ theme }) => theme.radii.panel};
  }
`;

export const Title = styled.h1`
  font-size: 44px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 12px;

  @media (max-width: 768px) { font-size: 32px; }
`;

export const Subtitle = styled.p`
  font-size: 17px;
  font-weight: 500;
  line-height: 1.55;
  color: rgba(28, 28, 30, 0.68);
  margin: 0 0 28px;
  max-width: 680px;

  @media (max-width: 768px) { font-size: 15px; }
`;

export const Meta = styled.p`
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.sunDeep};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 24px;
`;

export const Section = styled.section`
  margin-bottom: 30px;

  &:last-child { margin-bottom: 0; }
`;

export const SectionTitle = styled.h2`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 12px;

  @media (max-width: 768px) { font-size: 22px; }
`;

export const SubTitle = styled.h3`
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 22px 0 10px;
`;

export const SubSubTitle = styled.h4`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 18px 0 8px;
`;

export const Paragraph = styled.p`
  font-size: 16px;
  font-weight: 500;
  line-height: 1.65;
  color: rgba(28, 28, 30, 0.78);
  margin: 0 0 14px;
  max-width: 72ch;
`;

export const List = styled.ul`
  margin: 0 0 16px;
  padding-left: 22px;
  max-width: 72ch;
`;

export const ListItem = styled.li`
  font-size: 16px;
  font-weight: 500;
  line-height: 1.65;
  color: rgba(28, 28, 30, 0.78);
  margin-bottom: 8px;

  &::marker { color: ${({ theme }) => theme.colors.ink}; }
`;

export const StrongText = styled.strong`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.ink};
`;

export const TextLink = styled.a`
  color: ${({ theme }) => theme.colors.blue};
  font-weight: 700;
  text-decoration: none;

  &:hover { text-decoration: underline; }
`;

/* ── Cards grid ─────────────────────────────────────────────────────── */

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
`;

export const GridCard = styled.div`
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  padding: 22px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover { transform: translateY(-2px); box-shadow: 0 4px 0 ${({ theme }) => theme.colors.ink}; }
`;

export const IconTile = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 13px;
  background: ${({ $bg, theme }) => $bg || theme.colors.sun};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: ${({ theme }) => theme.colors.ink};
  margin-bottom: 14px;
`;

export const CardTitle = styled.h3`
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.ink};
  margin: 0 0 8px;
`;

export const CardText = styled.p`
  font-size: 15px;
  font-weight: 500;
  line-height: 1.55;
  color: rgba(28, 28, 30, 0.66);
  margin: 0;
`;

/* ── Stats ──────────────────────────────────────────────────────────── */

export const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  padding: 24px;
  text-align: center;
`;

export const StatNumber = styled.div`
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.sun};
  margin-bottom: 4px;
`;

export const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
`;

/* ── Forms ──────────────────────────────────────────────────────────── */

/* The form is its own paper slate so it reads as a card on the amber canvas. */
export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 28px;

  @media (max-width: 768px) {
    padding: 20px 18px;
    border-radius: ${({ theme }) => theme.radii.panel};
  }
`;

export const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  /* Pages wrap each label+field in a plain <div>; keep those stacked. */
  > div { display: flex; flex-direction: column; }
`;

export const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
  margin-bottom: 7px;
`;

export const Input = styled.input`
  display: block;
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 15.5px;
  font-weight: 500;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.ink};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.sun};
  }
`;

export const Textarea = styled.textarea`
  display: block;
  width: 100%;
  min-height: 140px;
  resize: vertical;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 15.5px;
  font-weight: 500;
  line-height: 1.55;
  font-family: inherit;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.ink};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.sun};
  }
`;

export const Submit = styled.button`
  align-self: flex-start;
  height: 52px;
  padding: 0 28px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease;

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.inkSoft}; }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 560px) { align-self: stretch; }
`;

export const SuccessBox = styled.div`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.sunDeep};
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
`;

export const ErrorBox = styled.div`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.red};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.paper};
`;
