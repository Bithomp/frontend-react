import styled from "styled-components";

export const Card = styled.div`
  border-top: 4px solid var(--accent-link);
  box-shadow: 0 1px 3px hsla(0,0%,0%,0.2);
  padding: 8px;
  margin-bottom: 16px;
`;

export const Heading = styled.h1`
  margin: 24px 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  text-transform: uppercase;
`;

export const Info = styled.p`
  color: var(--text-main);
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  word-break: break-word;
  text-align: center;
`;

export const Type = styled.span`
  color: var(--text-main);
  font-size: 16px;
  font-weight: 600;
  text-transform: capitalize;
`;

