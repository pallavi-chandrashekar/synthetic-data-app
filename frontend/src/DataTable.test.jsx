import { render, screen } from '@testing-library/react';
import DataTable from './DataTable.jsx';

const sampleData = [
  { name: 'Alice', age: '30', country: 'US' },
  { name: 'Bob', age: '25', country: 'UK' },
  { name: 'Charlie', age: '35', country: 'US' },
];

describe('DataTable', () => {
  it('renders nothing when data is empty', () => {
    const { container } = render(<DataTable data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when data is not an array', () => {
    const { container } = render(<DataTable data="not an array" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the preview heading', () => {
    render(<DataTable data={sampleData} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable data={sampleData} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
