import styled from "styled-components";

export const TDetails = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  margin: auto;
`;

export const TBody = ({ children }) => <tbody>{children}</tbody>;
export const TRow = ({ children }) => <tr>{children}</tr>;

export const TData = styled.td`
  padding: 4px;
  border-bottom: 1px solid var(--border-color);
  &:first-child {
    color: var(--text-secondary);
    text-align: right;
  }
  &:nth-child(2) {
    word-break: break-word;
  }
`;
