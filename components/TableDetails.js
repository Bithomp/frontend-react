import styled from "styled-components";

export const Root = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 400;
  text-align: left;
`;

export const Body = ({ children }) => <tbody>{children}</tbody>;
export const Row = ({ children }) => <tr>{children}</tr>;

export const Data = styled.td`
  padding: 4px;
  border-bottom: 1px solid var(--border-color);
  &:first-child {
    color: var(--text-secondary);
    width: 20%;
  }
  &:nth-child(2) {
    word-break: break-word;
  }
`;
