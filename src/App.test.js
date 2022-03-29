import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Explorer link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Explorer/i);
  expect(linkElement).toBeInTheDocument();
});
